'use server';

/**
 * 인증 관련 서버 액션 함수들
 *
 * - 로그인 처리 및 토큰 저장
 * - 토큰 갱신 (refresh token 사용)
 * - 로그아웃 및 쿠키 정리
 * - 자동 로그인 설정에 따른 토큰 만료 시간 조정
 */

import { ApiRes } from '@/types/api.types';
import { LoginCredentials, LoginResult, RefreshTokenResult } from '@/types/auth.types';
import { User } from '@/types/user.types';
import { cookies } from 'next/headers';

// 환경 변수에서 API 설정 가져오기
const API_URL = process.env.API_URL || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

/**
 * 로그인 서버 액션
 *
 * 사용자 로그인을 처리하고 성공 시 안전한 쿠키에 인증 정보를 저장
 *
 * 토큰 만료 시간:
 * - 자동 로그인 체크: user-auth 7일, refresh-token 14일, JWT 7일
 * - 자동 로그인 미체크: user-auth 4시간, refresh-token 8시간, JWT 4시간
 *
 * @param credentials - 로그인 자격 증명 (이메일, 비밀번호, 자동로그인 여부)
 * @returns 표준화된 API 응답 형태 (성공/실패 상태, 사용자 정보, 토큰)
 */
export async function loginAction(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    // 내부 함수 호출
    const result = await loginUser(credentials);

    // 로그인 성공 시 서버에서 안전하게 쿠키 설정
    if (result.ok === 1) {
      const cookieStore = await cookies();

      // 자동 로그인 설정에 따른 토큰 만료시간 분기 설정
      // 자동 로그인 체크: 장기간 보관
      // 자동 로그인 미체크: JWT 토큰 만료시간과 맞춤 (4시간)
      const userAuthMaxAge = credentials.rememberLogin ? 60 * 60 * 24 * 7 : 60 * 60 * 4; // 7일 or 4시간
      const refreshTokenMaxAge = credentials.rememberLogin ? 60 * 60 * 24 * 14 : 60 * 60 * 8; // 14일 or 8시간

      // 인증 데이터 구조 생성
      const authData = {
        state: {
          user: {
            _id: result.item.user._id,
            email: result.item.user.email,
            name: result.item.user.name,
            type: result.item.user.type,
            createdAt: result.item.user.createdAt,
            updatedAt: result.item.user.updatedAt,
            token: {
              accessToken: result.item.user.token?.accessToken,
            },
          },
          isLoading: false,
          lastTokenRefresh: Date.now(), // 토큰 갱신 시간 기록
          sessionStartTime: Date.now(), // 세션 시작 시간 (비자동 로그인 시 만료 검증용)
          rememberLogin: credentials.rememberLogin, // 자동 로그인 설정 저장
        },
      };

      // 사용자 정보를 쿠키에 저장
      cookieStore.set('user-auth', JSON.stringify(authData), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
        sameSite: 'strict', // CSRF 공격 방지
        maxAge: userAuthMaxAge, // 자동 로그인 설정에 따른 만료 시간
        path: '/', // 모든 경로에서 접근 가능
      });

      // 리프레시 토큰은 별도의 httpOnly 쿠키로 저장
      if (result.item.user.token?.refreshToken) {
        cookieStore.set('refresh-token', result.item.user.token.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: refreshTokenMaxAge, // 사용자 토큰보다 긴 만료 시간
          path: '/', // 모든 경로에서 접근 가능
        });
      }
    }

    return result;
  } catch (error) {
    console.error('[로그인 액션] 오류:', error);
    return {
      ok: 0,
      message: '로그인 처리 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 토큰 갱신 서버 액션
 *
 * 만료된 액세스 토큰을 새로운 토큰으로 갱신하는 서버 액션
 * httpOnly 쿠키에 저장된 리프레시 토큰을 사용하여 새로운 액세스 토큰을 발급받고
 * 사용자 인증 쿠키의 토큰 정보를 업데이트
 *
 * @param {string} [refreshToken] - 리프레시 토큰 (선택사항, 없으면 쿠키에서 가져옴)
 * @returns {Promise<RefreshTokenResult>} API 응답 형태
 * @returns {RefreshTokenResult.ok} 1: 성공, 0: 실패
 * @returns {RefreshTokenResult.message} 처리 결과 메시지
 * @returns {RefreshTokenResult.item.accessToken} 새로 발급받은 액세스 토큰
 */
export async function refreshTokenAction(refreshToken?: string): Promise<RefreshTokenResult> {
  try {
    const cookieStore = await cookies();

    // refreshToken이 제공되지 않으면 httpOnly 쿠키에서 가져오기
    const tokenToUse = refreshToken || cookieStore.get('refresh-token')?.value;

    if (!tokenToUse) {
      return {
        ok: 0,
        message: '리프레시 토큰이 없습니다.',
        item: {
          accessToken: '',
        },
      };
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': CLIENT_ID,
        ...(tokenToUse && { Authorization: `Bearer ${tokenToUse}` }),
      },
      credentials: 'include', // 쿠키 포함
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // 토큰 갱신 성공 시 사용자 쿠키 업데이트
    if (result.ok === 1) {
      const userAuthCookie = cookieStore.get('user-auth')?.value;
      if (userAuthCookie) {
        try {
          const userData = JSON.parse(userAuthCookie);
          if (userData.state?.user?.token) {
            // 새로운 액세스 토큰으로 업데이트
            userData.state.user.token.accessToken = result.item.accessToken;
            userData.state.lastTokenRefresh = Date.now();

            cookieStore.set('user-auth', JSON.stringify(userData), {
              httpOnly: false,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 60 * 60 * 4, // 4시간으로 통일
              path: '/',
            });
          }
        } catch (parseError) {
          console.error('[토큰 갱신 액션] 쿠키 파싱 오류:', parseError);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('[토큰 갱신 액션] 오류:', error);
    return {
      ok: 0,
      message: '토큰 갱신 처리 중 오류가 발생했습니다.',
      item: {
        accessToken: '',
      },
    };
  }
}

/**
 * 로그아웃 서버 액션
 *
 * 사용자 로그아웃을 처리하는 서버 액션으로, 클라이언트의 모든 인증 정보를 안전하게 삭제
 *
 * @returns {Promise<ApiRes<{message: string}>>} API 응답 형태
 * @returns {ApiRes.ok} 1: 성공, 0: 실패 (쿠키는 삭제됨)
 * @returns {ApiRes.item.message} 로그아웃 처리 결과 메시지
 * @returns {ApiRes.message} 실패 시 오류 메시지
 *
 * @returns {Promise<ApiRes<{message: string}>>} API 응답 형태
 * @returns {ApiRes.ok} 1: 성공, 0: 실패 (쿠키는 삭제됨)
 * @returns {ApiRes.item.message} 로그아웃 처리 결과 메시지
 * @returns {ApiRes.message} 실패 시 오류 메시지
 */
export async function logoutAction(): Promise<ApiRes<{ message: string }>> {
  try {
    const cookieStore = await cookies();

    // 로그아웃 처리: 쿠키만 삭제
    cookieStore.delete('user-auth');
    cookieStore.delete('refresh-token');

    return {
      ok: 1,
      item: { message: '로그아웃 처리되었습니다.' },
    };
  } catch (error) {
    console.error('[로그아웃 액션] 오류:', error);

    // 에러가 발생해도 쿠키는 삭제
    const cookieStore = await cookies();
    cookieStore.delete('user-auth');
    cookieStore.delete('refresh-token');

    return {
      ok: 0,
      message: '로그아웃 처리 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 로그인 API 호출 내부 함수
 *
 * 외부 인증 API에 로그인 요청을 수행하는 내부 함수
 *
 * 에러 처리:
 * - 네트워크 오류: 사용자 친화적 메시지 제공
 * - API 오류: 서버에서 제공한 오류 메시지 전달
 * - 데이터 검증 오류: 상세한 오류 로깅과 안전한 메시지 반환
 *
 * @param {LoginCredentials} credentials - 로그인 자격 증명 객체
 * @param {string} credentials.email - 사용자 이메일 주소
 * @param {string} credentials.password - 사용자 비밀번호
 * @param {boolean} credentials.rememberLogin - 자동 로그인 유지 여부
 * @returns {Promise<LoginResult>} 표준화된 API 응답 형태
 * @returns {LoginResult.ok} 1: 성공, 0: 실패
 * @returns {LoginResult.message} 실패 시 오류 메시지
 * @returns {LoginResult.errors} API 검증 오류 목록 (있는 경우)
 * @returns {LoginResult.item.user} 로그인된 사용자 정보
 * @returns {LoginResult.item.token} 인증 토큰 (액세스/리프레시)
 *
 * @private
 */
async function loginUser(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    // 자동 로그인 설정에 따른 JWT 토큰 만료 시간 설정
    const expiresIn = credentials.rememberLogin ? '7d' : '4h'; // 자동 로그인: 7일, 일반 로그인: 4시간

    // API에 로그인 요청
    const res = await fetch(`${API_URL}/users/login?expiresIn=${expiresIn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': CLIENT_ID,
      },
      body: JSON.stringify(credentials),
    });

    // API 응답 처리
    const data = await res.json();

    if (!res.ok) {
      console.error('[로그인 함수] API 오류:', data);
      return {
        ok: 0,
        message: data.message || '로그인에 실패했습니다.',
        errors: data.errors,
      };
    }

    // API 응답 데이터 검증
    const user: User = data.item;
    if (!user) {
      return {
        ok: 0,
        message: '로그인 정보가 올바르지 않습니다.',
      };
    }

    try {
      // 타입 안전성을 보장하는 변환
      const token = user.token?.accessToken;

      if (!token) {
        return {
          ok: 0,
          message: '인증 토큰을 가져올 수 없습니다.',
        };
      }

      console.log('[로그인 함수] 성공:', { userId: user._id, email: user.email });
      return {
        ok: 1,
        item: { user, token },
      };
    } catch (validationError) {
      console.error('[로그인 함수] 데이터 검증 오류:', validationError);
      return {
        ok: 0,
        message: validationError instanceof Error ? validationError.message : '사용자 데이터가 유효하지 않습니다.',
      };
    }
  } catch (error) {
    console.error('[로그인 함수] 네트워크 오류:', error);
    return {
      ok: 0,
      message: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    };
  }
}
