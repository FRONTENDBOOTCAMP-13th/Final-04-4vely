// src/components/ui/BookmarkButton.tsx
'use client';

import { Button } from '@/components/ui/Button';
/**
 * 북마크 버튼 컴포넌트
 * @description 상품, 게시글, 사용자 등 다양한 타입의 북마크를 지원하는 범용 북마크 버튼
 * @module BookmarkButton
 */

import { toggleBookmarkAction } from '@/lib/actions/shop/bookmarkServerActions';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/authStore';
import { BookmarkType } from '@/types/bookmark.types';
import { Bookmark } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

/**
 * 북마크 버튼 Props
 */
interface BookmarkButtonProps {
  /** 북마크 대상 ID (상품 ID, 게시글 ID 등) */
  targetId?: number;
  /** 북마크 타입 */
  type?: BookmarkType;
  /** 상품 ID (product 타입에서만 사용) */
  productId?: number;
  /** 서버에서 전달받은 북마크 ID (북마크된 경우에만 존재) */
  myBookmarkId?: number;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 북마크 변경 시 콜백 */
  onBookmarkChange?: (isBookmarked: boolean, bookmarkId?: number) => void;
  /** 북마크 후 revalidate 여부 (기본: true) */
  revalidate?: boolean;
  /** 북마크 종류 */
  variant?: 'icon' | 'text';
  postSubType?: 'magazine' | 'community';
}

/**
 * 북마크 버튼 컴포넌트
 * @param {BookmarkButtonProps} props - 컴포넌트 props
 * @returns {JSX.Element} 북마크 버튼
 * @example
 * // 상품 북마크 버튼
 * <BookmarkButton
 *   targetId={123}
 *   type="product"
 *   myBookmarkId={456}
 * />
 *
 * // 게시글 북마크 버튼
 * <BookmarkButton
 *   targetId={789}
 *   type="post"
 *   size={24}
 *   className="custom-class"
 * />
 */
export default function BookmarkButton({ targetId: propTargetId, postSubType, type = 'product', productId, myBookmarkId, revalidate = true, variant = 'icon', className = '', onBookmarkChange }: BookmarkButtonProps) {
  // 모든 Hook을 최상위에서 호출 (조건문 이전)
  const [isPending, startTransition] = useTransition();
  const [isProcessing, setIsProcessing] = useState(false);
  const { isLoggedIn } = useAuth();

  // 북마크 상태를 로컬 state로 관리
  const [localBookmarkId, setLocalBookmarkId] = useState<number | undefined>(myBookmarkId);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(!!myBookmarkId);

  // Hook 호출 이후에 조건 체크
  const targetId = propTargetId || productId;

  // 로그아웃 감지 - 인증 상태가 변경되면 북마크 상태 초기화
  useEffect(() => {
    if (!isLoggedIn) {
      setLocalBookmarkId(undefined);
      setIsBookmarked(false);
    }
  }, [isLoggedIn]);

  if (!targetId) {
    return null;
  }

  // 북마크 토글 핸들러
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 로그인되지 않은 경우
    if (!isLoggedIn) {
      toast.error('로그인이 필요한 기능입니다.', {
        description: '로그인 후 북마크를 사용하실 수 있습니다.',
      });
      return;
    }

    // 이미 처리 중인 경우 중복 요청 방지
    if (isProcessing || isPending) {
      return;
    }

    setIsProcessing(true);

    // 낙관적 업데이트
    const previousBookmarkId = localBookmarkId;
    const previousIsBookmarked = isBookmarked;

    if (isBookmarked) {
      setIsBookmarked(false);
      setLocalBookmarkId(undefined);
    } else {
      setIsBookmarked(true);
      setLocalBookmarkId(-1);
    }

    // 서버 액션 호출
    startTransition(async () => {
      try {
        const result = await toggleBookmarkAction(targetId, type, {
          revalidate,
          postSubType,
        });

        if (result.ok) {
          const action = result.item?.action;

          if (action === 'added') {
            const newBookmarkId = result.item?.bookmarkId || -1;
            setLocalBookmarkId(newBookmarkId);
            setIsBookmarked(true);

            const messages = {
              product: '상품을 북마크에 추가했습니다.',
              post: '게시글을 북마크에 추가했습니다.',
              user: '사용자를 북마크에 추가했습니다.',
            };

            toast.success(messages[type], {
              description: '마이페이지에서 확인하실 수 있습니다.',
            });

            onBookmarkChange?.(true, newBookmarkId);
          } else if (action === 'removed') {
            setLocalBookmarkId(undefined);
            setIsBookmarked(false);

            const messages = {
              product: '상품을 북마크에서 제거했습니다.',
              post: '게시글을 북마크에서 제거했습니다.',
              user: '사용자를 북마크에서 제거했습니다.',
            };

            toast.success(messages[type]);
            onBookmarkChange?.(false);
          }
        } else {
          // 실패한 경우 이전 상태로 롤백
          setLocalBookmarkId(previousBookmarkId);
          setIsBookmarked(previousIsBookmarked);
          toast.error(result.message || '북마크 처리에 실패했습니다.');
        }
      } catch {
        // 에러 발생 시 이전 상태로 롤백
        setLocalBookmarkId(previousBookmarkId);
        setIsBookmarked(previousIsBookmarked);
        toast.error('북마크 처리 중 오류가 발생했습니다.');
      } finally {
        setIsProcessing(false);
      }
    });
  };

  // 게시글 상세 페이지에서 이용하는 북마크 버튼 (text)
  if (variant === 'text') {
    return (
      <Button
        type='button'
        onClick={handleClick}
        disabled={isProcessing || isPending}
        variant='outline'
        size='sm'
        aria-label={isBookmarked ? '북마크 제거' : '북마크 추가'}
        aria-pressed={isBookmarked}
        className={cn('border-[0.5px] border-gray-300 text-xs transition-all duration-200 md:py-4 md:text-sm lg:py-5 lg:text-base', isBookmarked ? 'bg-amber-500 text-white hover:bg-amber-600' : 'hover:bg-amber-500', className)}
      >
        <Bookmark className='size-4' />
        북마크
      </Button>
    );
  }

  // 버튼 스타일
  const baseButtonClass = `
    relative flex items-center justify-center transition-all duration-200 w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:8
    ${isBookmarked ? 'text-amber-500 hover:text-amber-600' : 'text-gray-400 hover:text-gray-600'}
    ${isProcessing || isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `.trim();

  return (
    <button type='button' onClick={handleClick} className={baseButtonClass} disabled={isProcessing || isPending} aria-label={isBookmarked ? '북마크 제거' : '북마크 추가'} aria-pressed={isBookmarked}>
      <Bookmark className={cn('transition-all duration-200', isBookmarked ? 'fill-current' : '', 'h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8')} aria-hidden='true' focusable='false' />

      {/* 로딩 중 표시 */}
      {(isProcessing || isPending) && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent' />
        </div>
      )}
    </button>
  );
}
