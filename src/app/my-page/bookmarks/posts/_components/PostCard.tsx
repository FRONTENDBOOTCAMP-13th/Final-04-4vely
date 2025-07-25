import { Button } from '@/components/ui/Button';
import { Eye, MessageCircle, Trash2, User } from 'lucide-react';
import Image from 'next/image';

interface PostCardProps {
  post: {
    id: number;
    imageUrl: string;
    title: string;
    content: string;
    author: string;
    viewCount: number;
    commentCount: number;
  };
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <div className='group relative mx-auto w-full max-w-6xl cursor-pointer rounded-2xl bg-white p-3 shadow-sm transition-shadow duration-300 hover:shadow-lg'>
      {/* 삭제버튼 */}
      <div className='absolute top-3 right-3 z-10 md:hidden'>
        <Button variant='destructive' size='sm'>
          <Trash2 className='size-4' />
        </Button>
      </div>

      <div className='grid grid-cols-1 items-center gap-4 md:grid-cols-[auto_1fr_auto] md:gap-6'>
        {/* 게시글 이미지 */}
        <div className='grid place-items-center'>
          <div className='aspect-square w-[12.5rem]'>
            <Image src={post.imageUrl} alt='post-image' width={200} height={200} className='h-full w-full rounded-xl border bg-gray-100 object-cover' sizes='(max-width: 640px) 110px, 170px' priority />
          </div>
        </div>
        {/* 게시글 정보 */}
        <div className='flex h-full flex-col justify-between gap-3'>
          {/* 게시글 제목 */}
          <div className='grid justify-items-start'>
            <span className='t-desc text-secondary/70'>제목</span>
            <h3 className='text-secondary text-lg font-bold'>{post.title}</h3>
          </div>

          {/* 게시글 내용 */}
          <div className='grid justify-items-start'>
            <span className='t-desc text-secondary/70'>내용</span>
            <p className='t-small text-gray-secondary line-clamp-2 font-medium'>{post.content}</p>
          </div>

          {/* 게시글 메타 정보 */}
          <div className='flex flex-wrap items-center gap-4 text-sm text-gray-500'>
            {/* 작성자 */}
            <div className='flex items-center gap-1'>
              <User className='size-4' />
              <span>{post.author}</span>
            </div>
            {/* 조회수 */}
            <div className='flex items-center gap-1'>
              <Eye className='size-4' />
              <span>{post.viewCount.toLocaleString()}</span>
            </div>
            {/* 댓글 수 */}
            <div className='flex items-center gap-1'>
              <MessageCircle className='size-4' />
              <span>{post.commentCount}</span>
            </div>
          </div>
        </div>
        {/* 액션 버튼 - md 이상에서만 표시 */}
        <div className='flex h-full min-w-[12.5rem] flex-col items-end justify-between gap-3'>
          <div className='hidden flex-col gap-3 md:flex'>
            <Button variant='destructive' size='sm'>
              <Trash2 className='size-4' />
            </Button>
          </div>
          <div className='flex w-full flex-col gap-3'>
            <Button variant='default' size='sm' fullWidth>
              상세보기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
