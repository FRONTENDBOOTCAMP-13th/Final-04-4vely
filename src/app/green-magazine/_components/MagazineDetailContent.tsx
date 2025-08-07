import { MagazinePostData } from '@/app/green-magazine/_types/magazine.types';
import { formatDate } from '@/app/my-page/my-plants/_utils/diaryUtils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import BookmarkButton from '@/components/ui/BookmarkButton';
import { Eye } from 'lucide-react';
import Image from 'next/image';

interface DetailContent {
  post: MagazinePostData;
  myBookmarkId?: number | null;
}

export default function MagazineDetailContent({ post, myBookmarkId }: DetailContent) {
  return (
    <div className='text-secondary w-full'>
      {/* 대표 이미지 */}
      <div className='relative h-[15rem] w-full md:h-[18rem] lg:h-[23rem]'>
        <Image src={post.image} alt='게시글 대표 이미지' fill className='object-cover' priority />
      </div>

      <main className='mx-auto w-full max-w-4xl px-4 py-10 md:p-6 lg:px-8 lg:py-12'>
        {/* 제목 & 작성자 & 작성일 & 조회 수 */}
        <section className='mb-8 border-b-2 pb-6'>
          <h1 className='mb-4 text-xl font-semibold md:text-2xl lg:text-3xl'>{post.title}</h1>
          <div className='flex items-center justify-between text-sm text-gray-500 md:text-base'>
            <div className='flex items-center gap-2'>
              <Avatar className='border-muted h-8 w-8 rounded-3xl border'>
                <AvatarImage src={post.user.image} alt={post.user.name} />
                <AvatarFallback>{post.user.name}</AvatarFallback>
              </Avatar>
              <span>{post.user.name}</span>
              <span>·</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>
            <span className='flex items-center gap-1'>
              <Eye size={14} />
              {post.views}
            </span>
          </div>
        </section>

        {/* 본문 내용 */}
        <section className='mx-auto mb-10 max-w-[52rem] px-4 text-center'>
          {post.extra?.contents?.map((item, i) => (
            <div className='mb-10' key={i}>
              <Image src={item.postImage} alt={`콘텐츠 이미지 ${i + 1}`} width={300} height={400} className='mx-auto w-full max-w-[30rem] rounded-xl border' />
              <p className='mx-auto mt-6 leading-7 sm:max-w-[55ch] md:max-w-[60ch] lg:max-w-[65ch] lg:text-lg'>{item.content}</p>
            </div>
          ))}
        </section>

        {/* 하단 북마크 */}
        <div className='flex justify-end border-t-2 pt-6'>
          <BookmarkButton targetId={post._id} postSubType='magazine' type='post' myBookmarkId={myBookmarkId ?? undefined} revalidate={false} variant='text' />
        </div>
      </main>
    </div>
  );
}
