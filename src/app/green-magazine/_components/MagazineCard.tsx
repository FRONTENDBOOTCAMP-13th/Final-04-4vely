'use client';

import { MagazinePostData } from '@/app/green-magazine/_types/magazine.types';
import { formatDate } from '@/app/my-page/my-plants/_utils/diaryUtils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import BookmarkButton from '@/components/ui/BookmarkButton';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import Link from 'next/link';

interface MagazineCardProps {
  post: MagazinePostData;
  priority?: boolean;
}

// 매거진 메인 페이지 카드 컴포넌트
export default function MagazineCard({ post, priority = false }: MagazineCardProps) {
  return (
    <div className='flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm hover:shadow-md md:flex-row md:gap-10'>
      {/* 이미지 */}
      <div className='relative h-40 w-full overflow-hidden rounded-lg md:h-50 md:w-1/5'>
        <Image src={post.image} alt={post.title} fill sizes='(max-width: 768px) 100vw, 20vw' className='object-cover' priority={priority} />
      </div>

      {/* 콘텐츠 영역 */}
      <div className='flex flex-1 flex-col justify-between md:max-w-[80%]'>
        <div className='flex items-center justify-between'>
          <h3 className='line-clamp-1 text-base font-semibold md:mt-2 md:text-xl'>{post.title}</h3>
          {/* 북마크 버튼 */}
          <BookmarkButton targetId={post._id} postSubType='magazine' type='post' myBookmarkId={post.myBookmarkId ?? undefined} revalidate={false} variant='icon' />
        </div>
        <p className='text-muted my-3 line-clamp-2 max-w-[80ch] text-sm md:mt-0 md:mb-10 md:text-base'>{post.content}</p>
        <div className='mt-4 grid w-full grid-cols-1 gap-1 md:grid-cols-[1fr_auto] md:items-center'>
          {/* 작성자 & 작성 날짜 & 조회 수 */}
          <div className='flex items-center gap-2 text-center text-xs text-gray-500 md:text-sm'>
            <Avatar className='border-muted h-8 w-8 rounded-3xl border'>
              <AvatarImage src={post.user.image} alt={post.user.name} />
              <AvatarFallback>{post.user.name}</AvatarFallback>
            </Avatar>
            <span>{post.user.name}</span>
            <span>·</span>
            <span>{formatDate(post.createdAt)}</span>
            <span>·</span>
            <span>조회수 {post.views}</span>
          </div>
          {/* 상세보기 버튼 */}
          <div className='flex justify-end'>
            <Button asChild variant='primary' className='px-3 text-xs md:px-4 md:text-sm lg:p-5 lg:text-base'>
              <Link href={`/green-magazine/${post._id}`}>상세보기</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
