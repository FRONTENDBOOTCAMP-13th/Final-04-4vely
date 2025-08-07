// src/lib/actions/shop/bookmarkServerActions.ts
'use server';

/**
 * 북마크 서버 액션
 * @description 클라이언트에서 직접 호출 가능한 서버 액션들
 * @module bookmarkServerActions
 */

import { getAuthInfo } from '@/lib/utils/auth.server';
import { BookmarkActionApiResponse, BookmarkType } from '@/types/bookmark.types';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL || 'https://fesp-api.koyeb.app/market';
const CLIENT_ID = process.env.CLIENT_ID || 'febc13-final04-emjf';

interface ToggleBookmarkOptions {
  revalidate?: boolean;
  postSubType?: 'magazine' | 'community';
}

/**
 * 북마크를 토글합니다 (추가/제거)
 * @param {number} targetId - 북마크 대상 ID (상품 ID, 게시글 ID 등)
 * @param {BookmarkType} type - 북마크 타입 ('product' | 'post' | 'user')
 * @param options 추가 옵션 - revalidatePath 여부 등
 * @returns {Promise<BookmarkActionApiResponse>} 처리 결과 (action: 'added' | 'removed')
 * @example
 * // 상품 북마크 토글
 * const result = await toggleBookmarkAction(123, 'product');
 *
 * // 게시글 북마크 토글
 * const result = await toggleBookmarkAction(456, 'post');
 */
export async function toggleBookmarkAction(targetId: number, type: BookmarkType = 'product', options: ToggleBookmarkOptions = { revalidate: true }): Promise<BookmarkActionApiResponse> {
  try {
    // 1. 인증 토큰 확인
    const authInfo = await getAuthInfo();

    if (!authInfo) {
      return {
        ok: 0,
        message: '로그인이 필요한 기능입니다.',
      };
    }

    const { accessToken } = authInfo;

    // 2. 기존 북마크 확인
    const existingBookmark = await checkExistingBookmark(targetId, type, accessToken);

    if (existingBookmark) {
      // 북마크 제거
      const deleteResult = await removeBookmark(existingBookmark._id, accessToken);

      if (deleteResult.ok) {
        if (options.revalidate) {
          // 관련 페이지 재검증
          revalidateBookmarkPages(targetId, type);
        }

        return {
          ok: 1,
          item: { action: 'removed', type },
        };
      } else {
        return {
          ok: 0,
          message: deleteResult.message || '북마크 삭제에 실패했습니다.',
        };
      }
    } else {
      // 북마크 추가
      const addResult = await addBookmark(targetId, type, accessToken);

      if (addResult.ok) {
        if (options.revalidate) {
          // 관련 페이지 재검증
          revalidateBookmarkPages(targetId, type);
        }

        return {
          ok: 1,
          item: {
            action: 'added',
            bookmarkId: addResult.item?._id,
            type,
          },
        };
      } else {
        return {
          ok: 0,
          message: addResult.message || '북마크 추가에 실패했습니다.',
        };
      }
    }
  } catch {
    return {
      ok: 0,
      message: '북마크 처리 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 특정 대상의 북마크 여부를 확인합니다
 * @private
 * @param {number} targetId - 대상 ID
 * @param {BookmarkType} type - 북마크 타입
 * @param {string} accessToken - 인증 토큰
 * @returns {Promise<any>} 북마크 정보 또는 null
 */
async function checkExistingBookmark(targetId: number, type: BookmarkType, accessToken: string) {
  try {
    const res = await fetch(`${API_URL}/bookmarks/${type}/${targetId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'client-id': CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.item) {
        return data.item;
      }
    } else if (res.status === 404) {
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 북마크를 추가합니다
 * @private
 * @param {number} targetId - 대상 ID
 * @param {BookmarkType} type - 북마크 타입
 * @param {string} accessToken - 인증 토큰
 * @param {string} memo - 메모 (선택)
 * @returns {Promise<any>} API 응답
 */
async function addBookmark(targetId: number, type: BookmarkType, accessToken: string, memo: string = '') {
  try {
    const requestBody = {
      target_id: targetId,
      memo,
    };

    const res = await fetch(`${API_URL}/bookmarks/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-id': CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: 0,
        message: data.message || '북마크 추가에 실패했습니다.',
      };
    }

    return {
      ok: 1,
      item: data.item,
    };
  } catch {
    return {
      ok: 0,
      message: '북마크 추가 중 서버 오류가 발생했습니다.',
    };
  }
}

/**
 * 북마크를 삭제합니다
 * @private
 * @param {number} bookmarkId - 북마크 ID
 * @param {string} accessToken - 인증 토큰
 * @returns {Promise<any>} API 응답
 */
async function removeBookmark(bookmarkId: number, accessToken: string) {
  try {
    const res = await fetch(`${API_URL}/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'client-id': CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: 0,
        message: data.message || '북마크 삭제에 실패했습니다.',
      };
    }

    return {
      ok: 1,
      item: { message: '북마크가 삭제되었습니다.' },
    };
  } catch {
    return {
      ok: 0,
      message: '북마크 삭제 중 서버 오류가 발생했습니다.',
    };
  }
}

/**
 * 북마크 관련 페이지들을 재검증합니다
 * @private
 * @param {number} targetId - 대상 ID
 * @param {BookmarkType} type - 북마크 타입
 */
function revalidateBookmarkPages(targetId: number, type: BookmarkType, postSubType?: 'magazine' | 'community') {
  // 북마크 목록 페이지
  revalidatePath('/my-page/bookmarks');

  // 타입별 상세 페이지 재검증
  switch (type) {
    case 'product':
      revalidatePath('/shop');
      revalidatePath(`/shop/products/${targetId}`);
      break;
    case 'post':
      if (postSubType === 'magazine') {
        revalidatePath('/green-magazine');
        revalidatePath(`/green-magazine/${targetId}`);
      } else {
        revalidatePath('/community');
        revalidatePath(`/community/${targetId}`);
      }
      break;
    case 'user':
      revalidatePath(`/users/${targetId}`);
      break;
  }
}

/**
 * 상품 전용 북마크 토글
 * @param {number} productId - 상품 ID
 * @returns {Promise<BookmarkActionApiResponse>} 처리 결과
 */
export async function toggleProductBookmarkAction(productId: number, options?: ToggleBookmarkOptions): Promise<BookmarkActionApiResponse> {
  return toggleBookmarkAction(productId, 'product', options);
}
