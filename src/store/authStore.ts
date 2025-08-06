/**
 * 사용자 인증 상태 관리 스토어
 *
 * Zustand를 사용한 전역 사용자 인증 상태 관리
 */

import { logoutAction, refreshTokenAction } from '@/lib/functions/authFunctions';
import { isTokenExpired, isTokenExpiringSoon } from '@/lib/utils/auth.client';
import { RefreshTokenResult } from '@/types/auth.types';
import { User, UserState } from '@/types/user.types';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';

/**
 * 쿠키 기반 스토리지 구현
 *
 * Zustand persist 미들웨어를 위한 커스텀 스토리지 구현
 * 서버 액션에서 설정한 쿠키를 클라이언트에서 읽기 전용으로 접근
 * 서버와 클라이언트 간의 인증 상태 일관성을 유지
 */
const cookieStorage: StateStorage = {
  /**
   * 쿠키에서 값을 가져오는 함수
   *
   * 브라우저 환경에서 document.cookie를 파싱하여 특정 쿠키 값을 추출
   * 서버 사이드 렌더링 환경에서는 안전하게 null을 반환
   *
   * @param {string} name - 가져올 쿠키의 이름
   * @returns {string | null} 쿠키 값 또는 null
   */
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;

    // 쿠키 파싱
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue ? decodeURIComponent(cookieValue) : null;
    }
    return null;
  },
  /**
   * 쿠키 설정 함수 (읽기 전용 모드)
   *
   * 클라이언트에서는 쿠키를 설정하지 않음
   * 모든 쿠키 설정은 서버 액션을 통해서만 수행되어 보안을 유지
   *
   * @param {string} _name - 쿠키 이름 (사용되지 않음)
   * @param {string} _value - 쿠키 값 (사용되지 않음)
   */
  setItem: (): void => {
    // zustand persist에서 쿠키 설정하지 않음 (서버 액션에서만 설정)
    // 클라이언트에서는 읽기 전용
  },
  /**
   * 쿠키 삭제 함수 (읽기 전용 모드)
   *
   * 클라이언트에서는 쿠키를 삭제하지 않음
   * 모든 쿠키 삭제는 서버 액션을 통해서만 수행되어 보안을 유지
   *
   * @param {string} _name - 쿠키 이름 (사용되지 않음)
   */
  removeItem: (): void => {
    // zustand persist에서 쿠키 삭제하지 않음 (서버 액션에서만 삭제)
  },
};

/**
 * 확장된 사용자 상태 인터페이스
 *
 * 기본 UserState를 확장하여 인증 관련 추가 기능을 제공
 *
 * @interface ExtendedUserState
 * @extends {UserState}
 */
interface ExtendedUserState extends UserState {
  /** 로딩 상태 플래그 */
  isLoading: boolean;
  /** 마지막 토큰 갱신 시간 (밀리초 타임스탬프) */
  lastTokenRefresh: number | null;
  /** 세션 시작 시간 (밀리초 타임스탬프) - 비자동 로그인 시 만료 검증용 */
  sessionStartTime: number | null;
  /** 자동 로그인 설정 여부 - 토큰 만료 시간과 세션 관리에 영향 */
  rememberLogin: boolean;
  /** 마지막 활동 시간 (밀리초 타임스탬프) - 비활성 세션 관리용 */
  lastActivityTime: number | null;

  /** 로딩 상태 설정 함수 */
  setLoading: (loading: boolean) => void;
  /** 토큰 자동 갱신 함수 - Promise<boolean> 반환 (성공 여부) */
  refreshUserToken: () => Promise<boolean>;
  /** 로그아웃 처리 함수 - 서버 액션을 통한 안전한 로그아웃 */
  logout: () => Promise<void>;
  /** 사용자 활동 시간 업데이트 함수 - 세션 만료 방지용 */
  updateActivity: () => void;
}

/**
 * 토큰 갱신 동시성 처리를 위한 Promise 캐시
 *
 * 동시에 여러 토큰 갱신 요청이 발생할 때 중복 요청을 방지
 * 하나의 갱신 요청 결과를 모든 대기 중인 요청에 공유
 *
 * @type {Promise<boolean> | null}
 */
let refreshPromise: Promise<boolean> | null = null;

/**
 * 로그아웃 진행 중 플래그
 * 토큰 갱신과 로그아웃의 경쟁 상태를 방지
 */
let isLoggingOut = false;

/**
 * 세션 시간 검증 함수 (4시간)
 * 여러 곳에서 사용되는 세션 만료 검증 로직을 통합
 */
const isSessionExpired = (sessionStartTime: number | null, lastActivityTime: number | null, rememberLogin: boolean): boolean => {
  if (rememberLogin) {
    return false; // 자동 로그인은 세션 시간 제한 없음
  }

  if (!sessionStartTime) {
    return false; // 세션 시작 시간이 없으면 만료되지 않음
  }

  const now = Date.now();
  const fourHours = 4 * 60 * 60 * 1000;

  // 세션 시작 후 4시간 또는 마지막 활동 후 4시간 경과 시 만료
  const sessionExpired = now - sessionStartTime > fourHours;
  const activityExpired = lastActivityTime ? now - lastActivityTime > fourHours : false;

  return sessionExpired || activityExpired;
};

/**
 * 사용자 인증 상태 관리 Zustand 스토어
 *
 * persist 미들웨어를 사용하여 쿠키 기반 상태 지속화를 구현
 * 서버 액션과 연동하여 안전한 인증 상태 관리를 제공
 * 토큰 자동 갱신, 세션 관리, 활동 추적 등의 기능을 포함
 *
 */
const useUserStore = create(
  persist<ExtendedUserState>(
    (set, get) => ({
      /** 로그인된 사용자 정보 (미로그인 시 null) */
      user: null,
      /** 로딩 상태 플래그 */
      isLoading: false,
      /** 마지막 토큰 갱신 시간 (밀리초 타임스탬프) */
      lastTokenRefresh: null,
      /** 세션 시작 시간 (밀리초 타임스탬프) */
      sessionStartTime: null,
      /** 자동 로그인 설정 여부 */
      rememberLogin: false,
      /** 마지막 활동 시간 (밀리초 타임스탬프) */
      lastActivityTime: null,

      /**
       * 사용자 정보 설정 함수
       *
       * 로그인 성공 시 사용자 정보를 스토어에 저장하고
       * 관련 타임스탬프들을 현재 시간으로 업데이트
       *
       * @param {User} user - 설정할 사용자 정보 객체
       */
      setUser: (user: User) => {
        set({
          user,
          lastTokenRefresh: Date.now(), // 사용자 설정 시 갱신 시간 업데이트
          lastActivityTime: Date.now(), // 활동 시간 업데이트
        });
      },

      /**
       * 사용자 상태 초기화 함수
       *
       * 로그아웃 시 모든 사용자 관련 상태를 초기값으로 되돌림
       * 보안을 위해 모든 세션 정보와 토큰 관련 데이터를 완전히 제거
       */
      resetUser: () => {
        // 로그아웃 플래그 설정
        isLoggingOut = true;

        // 토큰 자동 갱신 인터벌 정리
        stopTokenRefreshInterval();

        // 진행 중인 토큰 갱신 취소
        if (refreshPromise) {
          refreshPromise = null;
        }

        set({
          user: null,
          isLoading: false,
          lastTokenRefresh: null,
          sessionStartTime: null,
          rememberLogin: false,
          lastActivityTime: null,
        });

        // 로그아웃 완료 후 플래그 해제
        setTimeout(() => {
          isLoggingOut = false;
        }, 100);
      },

      /**
       * 로딩 상태 설정 함수
       *
       * API 호출이나 비동기 작업 중 로딩 상태를 관리
       * UI에서 로딩 인디케이터 표시 여부를 결정하는 데 사용
       *
       * @param {boolean} loading - 로딩 상태 (true: 로딩 중, false: 완료)
       */
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      /**
       * 사용자 활동 시간 업데이트 함수
       *
       * 사용자의 페이지 상호작용이나 API 호출 시 호출되어
       * 마지막 활동 시간을 현재 시간으로 업데이트
       * 자동 로그인이 비활성화된 경우에만 활동 시간을 추적하여
       * 비활성 세션의 자동 만료를 관리
       *
       * 동작 조건:
       * - 사용자가 로그인된 상태
       * - 자동 로그인이 비활성화된 상태 (rememberLogin: false)
       */
      updateActivity: () => {
        const state = get();
        if (state.user && !state.rememberLogin) {
          set({ lastActivityTime: Date.now() });
        }
      },

      /**
       * 토큰 자동 갱신 함수
       *
       * 만료된 액세스 토큰을 새로운 토큰으로 갱신하는 함수
       * 서버 액션을 통해 안전하게 토큰을 갱신하며, 동시성 처리를 통해
       * 여러 요청이 동시에 발생해도 하나의 갱신 요청만 수행
       *
       * 동작 과정:
       * 1. 이미 진행 중인 갱신이 있는지 확인 (중복 방지)
       * 2. 토큰 유효성 및 세션 시간 검증
       * 3. 서버 액션을 통한 토큰 갱신 요청
       * 4. 성공 시 스토어 상태 업데이트
       * 5. 실패 시 적절한 오류 처리 (세션 만료 시 로그아웃)
       *
       * @returns {Promise<boolean>} 갱신 성공 여부
       * @returns {boolean} true - 갱신 성공 또는 갱신 불필요
       * @returns {boolean} false - 갱신 실패 또는 세션 만료
       */
      refreshUserToken: async (): Promise<boolean> => {
        // 이미 진행 중인 토큰 갱신이 있으면 해당 Promise 반환
        if (refreshPromise) {
          return refreshPromise;
        }

        // 실제 토큰 갱신 로직을 별도 함수로 분리
        refreshPromise = performTokenRefresh();
        const result = await refreshPromise;
        refreshPromise = null;

        return result;
      },

      /**
       * 로그아웃 처리 함수
       *
       * 사용자 로그아웃을 안전하게 처리하는 함수
       * 서버 액션을 통해 쿠키를 삭제하고 로컬 상태를 초기화
       * 에러가 발생하더라도 로컬 상태는 반드시 초기화하여 보안을 유지
       *
       * 처리 과정:
       * 1. 로딩 상태 활성화
       * 2. 서버 액션을 통한 쿠키 삭제 (user-auth, refresh-token)
       * 3. 로컬 스토어 상태 완전 초기화
       * 4. 에러 발생 시에도 로컬 상태는 반드시 초기화
       *
       * @returns {Promise<void>} 로그아웃 처리 완료
       *
       * @example
       * const { logout } = useUserStore();
       * await logout(); // 안전한 로그아웃 처리
       */
      logout: async (): Promise<void> => {
        // 이미 로그아웃 진행 중이면 중복 실행 방지
        if (isLoggingOut) {
          return;
        }

        isLoggingOut = true;
        set({ isLoading: true });

        try {
          // 서버 액션을 통해 로그아웃 처리 (token 없이 호출하면 쿠키에서 가져옴)
          await logoutAction();
        } catch (error) {
          console.error('[로그아웃] 오류:', error);
        } finally {
          // 토큰 자동 갱신 인터벌 정리
          stopTokenRefreshInterval();

          // 진행 중인 토큰 갱신 취소
          if (refreshPromise) {
            refreshPromise = null;
          }

          // 로컬 상태도 초기화
          set({
            user: null,
            isLoading: false,
            lastTokenRefresh: null,
            sessionStartTime: null,
            rememberLogin: false,
            lastActivityTime: null,
          });

          // 로그아웃 완료 후 플래그 해제
          setTimeout(() => {
            isLoggingOut = false;
          }, 100);
        }
      },
    }),
    {
      name: 'user-auth', // 쿠키 이름 (서버 액션과 동일)
      storage: createJSONStorage(() => cookieStorage), // 쿠키 읽기 전용
      /**
       * 상태 복원 완료 후 실행되는 콜백 함수
       * @returns {Function} 상태 복원 후 실행될 콜백 함수
       */
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          // 통합된 세션 검증 함수 사용
          if (isSessionExpired(state.sessionStartTime, state.lastActivityTime, state.rememberLogin)) {
            console.log('[세션 만료] 4시간 경과로 자동 로그아웃');
            state.logout();
            return;
          }

          // 일반 로그인의 경우 활동 시간 업데이트
          if (!state.rememberLogin) {
            state.lastActivityTime = Date.now();
          }
        }
      },
    },
  ),
);

/**
 * 토큰 갱신 내부 구현 함수
 *
 * 실제 토큰 갱신 로직을 수행하는 내부 함수
 * 토큰 유효성 검증, 세션 시간 확인, API 호출, 상태 업데이트 등
 * 토큰 갱신에 필요한 모든 과정을 처리
 *
 * @returns {Promise<boolean>} 토큰 갱신 성공 여부
 * @returns {boolean} true - 갱신 성공 또는 갱신 불필요
 * @returns {boolean} false - 갱신 실패, 세션 만료, 또는 네트워크 오류
 *
 */
const performTokenRefresh = async (): Promise<boolean> => {
  // 로그아웃 진행 중이면 토큰 갱신 중단
  if (isLoggingOut) {
    return false;
  }

  const { user, lastTokenRefresh, rememberLogin } = useUserStore.getState();

  if (!user?.token?.refreshToken) {
    console.warn('[토큰 갱신] 리프레시 토큰이 없습니다.');
    return false;
  }

  // 통합된 세션 검증 함수 사용
  if (isSessionExpired(user.sessionStartTime || null, user.lastActivityTime || null, rememberLogin)) {
    console.log('[토큰 갱신] 세션 만료로 로그아웃');
    useUserStore.getState().logout();
    return false;
  }

  // 토큰 검증: 액세스 토큰이 아직 유효하면 갱신하지 않음
  if (user.token.accessToken && !isTokenExpired(user.token.accessToken) && !isTokenExpiringSoon(user.token.accessToken)) {
    return true;
  }

  // 중복 갱신 방지 (1분 이내 갱신한 경우)
  const oneMinuteAgo = Date.now() - 60 * 1000;
  if (lastTokenRefresh && lastTokenRefresh > oneMinuteAgo) {
    return true;
  }

  useUserStore.setState({ isLoading: true });

  try {
    // 토큰 갱신 시작 전 다시 한 번 로그아웃 상태 확인
    if (isLoggingOut) {
      useUserStore.setState({ isLoading: false });
      return false;
    }

    // 서버 액션을 통해 토큰 갱신 처리 (refreshToken 없이 호출하면 쿠키에서 가져옴)
    const refreshResult = (await refreshTokenAction()) as RefreshTokenResult;

    // 토큰 갱신 완료 후에도 로그아웃 상태 확인
    if (isLoggingOut) {
      return false;
    }

    if (refreshResult.ok === 1) {
      // 새로운 액세스 토큰으로 사용자 정보 업데이트
      const updatedUser: User = {
        ...user,
        token: {
          ...user.token,
          accessToken: refreshResult.item.accessToken,
        },
        lastActivityTime: Date.now(), // 토큰 갱신 시 활동 시간 업데이트
      };

      useUserStore.setState({
        user: updatedUser,
        isLoading: false,
        lastTokenRefresh: Date.now(),
      });

      console.log('[토큰 갱신] 성공');
      return true;
    } else {
      console.error('[토큰 갱신] 실패:', refreshResult.message);

      // 명확한 인증 오류(refresh token 만료, 인증 실패 등)인 경우에만 로그아웃
      if (refreshResult.message?.includes('리프레시 토큰') || refreshResult.message?.includes('만료') || refreshResult.message?.includes('인증') || refreshResult.message?.includes('토큰이 없습니다')) {
        console.log('[토큰 갱신] 인증 실패로 로그아웃 처리:', refreshResult.message);
        useUserStore.getState().logout();
      } else {
        // 서버 오류, 네트워크 오류 등의 경우 상태 유지하고 로딩만 해제
        console.log('[토큰 갱신] 일시적 오류로 상태 유지:', refreshResult.message);
        useUserStore.setState({ isLoading: false });
      }

      return false;
    }
  } catch (error) {
    console.error('[토큰 갱신] 네트워크 오류:', error);

    // 네트워크 오류인 경우 상태 유지, 로딩만 해제
    useUserStore.setState({ isLoading: false });
    return false;
  }
};

/**
 * 토큰 자동 갱신 인터벌 관리
 *
 * 주기적으로 토큰 상태를 확인하여 만료 예정인 토큰을 자동으로 갱신
 * 메모리 누수 방지를 위한 인터벌 생명주기 관리
 *
 * @type {NodeJS.Timeout | null} 토큰 체크 인터벌 ID
 */
let tokenCheckInterval: NodeJS.Timeout | null = null;

/**
 * 토큰 자동 갱신 인터벌 시작 함수
 *
 * 5분마다 실행되는 인터벌을 설정하여 토큰 상태를 주기적으로 확인
 * 액세스 토큰이 만료되었거나 곧 만료될 예정인 경우 자동으로 갱신을 수행
 * 기존 인터벌이 있는 경우 정리 후 새로운 인터벌을 설정
 *
 * 인터벌 주기: 5분 (300,000ms)
 *
 */
export const startTokenRefreshInterval = () => {
  // 기존 인터벌 정리 (메모리 누수 방지)
  if (tokenCheckInterval) {
    clearInterval(tokenCheckInterval);
    tokenCheckInterval = null;
  }

  // 5분마다 토큰 상태 확인
  tokenCheckInterval = setInterval(
    () => {
      const { user, refreshUserToken } = useUserStore.getState();

      if (user?.token?.accessToken) {
        // 토큰이 만료되었거나 곧 만료될 예정이면 갱신
        if (isTokenExpired(user.token.accessToken) || isTokenExpiringSoon(user.token.accessToken)) {
          refreshUserToken().catch((error) => {
            console.warn('[자동 토큰 갱신] 실패:', error);

            // 명확한 인증 오류(401, 403)이거나 refresh token 관련 오류인 경우에만 로그아웃
            // 네트워크 오류나 일시적 오류는 로그아웃하지 않음
            if (error?.status === 401 || error?.status === 403 || (error?.message && (error.message.includes('리프레시 토큰') || error.message.includes('인증')))) {
              console.log('[자동 토큰 갱신] 인증 오류로 자동 로그아웃:', error?.message || error?.status);
              useUserStore.getState().logout();
            } else {
              console.log('[자동 토큰 갱신] 일시적 오류로 다음 시도까지 대기:', error?.message);
            }
          });
        }
      }
    },
    5 * 60 * 1000,
  ); // 5분
};

/**
 * 토큰 자동 갱신 인터벌 중지 함수
 *
 * 실행 중인 토큰 체크 인터벌을 정리하고 메모리 누수를 방지
 * 사용자 로그아웃 시나 애플리케이션 종료 시 호출되어야 함
 */
export const stopTokenRefreshInterval = () => {
  if (tokenCheckInterval) {
    clearInterval(tokenCheckInterval);
    tokenCheckInterval = null;
  }
};

/**
 * 페이지 언로드 시 인터벌 정리
 *
 * 브라우저 창이 닫히거나 페이지를 떠날 때 실행 중인 인터벌을 정리하여
 * 메모리 누수를 방지
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stopTokenRefreshInterval();
  });
}

export default useUserStore;

/**
 * 통합 인증 상태 관리 훅
 *
 * NextAuth 세션과 Zustand 사용자 상태를 통합하여 관리하는 커스텀 훅
 * OAuth 로그인과 일반 로그인 모두를 지원하며, 통합된 인증 상태를 제공
 *
 */
export function useAuth() {
  const { user: zustandUser, logout: zustandLogout, ...rest } = useUserStore();
  const { data: session, status } = useSession();

  // NextAuth 세션 또는 Zustand user 중 하나라도 있으면 로그인된 것으로 간주
  const isLoggedIn = useMemo(() => !!session?.user || !!zustandUser, [session?.user, zustandUser]);

  // 현재 사용자 정보 (OAuth 우선, 그 다음 Zustand)
  const currentUser = useMemo(() => session?.user || zustandUser, [session?.user, zustandUser]);

  // 로딩 상태 (NextAuth 로딩 중이거나 Zustand 로딩 중)
  const isLoading = useMemo(() => status === 'loading' || rest.isLoading, [status, rest.isLoading]);

  return {
    // 통합 인증 상태
    isLoggedIn,
    currentUser,
    isLoading, // 통합된 로딩 상태

    // 개별 상태 (필요시 접근)
    zustandUser,
    session: session?.user,
    sessionStatus: status,

    // Zustand 메서드들 (isLoading 제외)
    setUser: rest.setUser,
    resetUser: rest.resetUser,
    setLoading: rest.setLoading,
    refreshUserToken: rest.refreshUserToken,
    lastTokenRefresh: rest.lastTokenRefresh,
    updateActivity: rest.updateActivity, // 활동 시간 업데이트 메서드 추가
    zustandLogout,
  };
}
