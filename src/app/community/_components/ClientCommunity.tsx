'use client';

import Error from '@/app/error';
import Loading from '@/app/loading';
import { formatDate } from '@/app/my-page/my-plants/_utils/diaryUtils';
import BookmarkButton from '@/components/ui/BookmarkButton';
import { Button } from '@/components/ui/Button';
import { Card, CardAvatar, CardContent, CardDescription, CardFooter, CardImage, CardTitle } from '@/components/ui/Card';
import PaginationWrapper from '@/components/ui/PaginationWrapper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch } from '@/components/ui/switch';
import { fetchPosts, fetchPostsByUserId, Pagination } from '@/lib/functions/communityFunctions';
import { useAuth } from '@/store/authStore';
import { Post } from '@/types/commnunity.types';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface Props {
  initialPosts: Post[];
  initialPagination: Pagination;
}

export default function ClientCommunity({ initialPosts, initialPagination }: Props) {
  const router = useRouter(); // 네비게이션용
  const { zustandUser, session, isLoggedIn } = useAuth();
  const userId = zustandUser?._id ? String(zustandUser._id) : session?.id ? String(session.id) : '';
  const token = zustandUser?.token?.accessToken || session?.accessToken;

  // 상태 정의
  const [posts, setPosts] = useState<Post[]>(initialPosts); // 게시물 목록
  const [pagination, setPagination] = useState<Pagination>(initialPagination); // 페이징 정보
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 메시지
  const [showMine, setShowMine] = useState(false); // 내가 쓴 글만 보기

  // 정렬 옵션
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'popular'>('recent');

  const handlePageChange = (page: number) => {
    router.push(`/community?page=${page}`);
    setPagination((p) => ({ ...p, page }));
  };

  // 게시물 불러오기
  useEffect(() => {
    if (showMine && !isLoggedIn) return;
    setLoading(true);
    const api = showMine ? fetchPostsByUserId(pagination.page, pagination.limit, token) : fetchPosts(pagination.page, pagination.limit, 'community', token);

    api
      .then(({ posts: newPosts, pagination: pg }) => {
        setPosts(newPosts);
        setPagination(pg);
        setError(null);
        // 서버 북마크 상태 동기화
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [showMine, userId, pagination.page, pagination.limit, token, isLoggedIn]);

  // 북마크 토글
  const handleBookmarkChange = (postId: string, isBookmarked: boolean, bookmarkId?: number) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, myBookmarkId: isBookmarked ? bookmarkId! : null } : p)));
  };

  // 정렬된 게시물
  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      switch (sortOrder) {
        case 'recent': // 최신순
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest': // 오래된순
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'popular': // 인기순
          return (b.stats.bookmarks ?? 0) - (a.stats.bookmarks ?? 0);
        default:
          return 0;
      }
    });
  }, [posts, sortOrder]);

  return (
    <div className='bg-surface mx-auto w-full max-w-[75rem] p-4 md:p-6 lg:p-8'>
      {/* 헤더 */}
      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-col items-start'>
          <p className='text-sm md:text-base lg:text-lg'>| Community</p>
          <h1 className='mt-2 mb-6 text-lg font-semibold md:text-2xl lg:text-3xl'>Community</h1>
        </div>
        <div className='flex w-full flex-col items-end gap-0 sm:w-auto'>
          <div className='flex items-center gap-1'>
            <label className='flex h-8 items-center gap-2'>
              <span className='text-sm font-medium'>내가 쓴 글</span>
              <Switch
                checked={showMine}
                onCheckedChange={(checked) => {
                  if (!isLoggedIn) return;
                  setShowMine(checked);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                disabled={!isLoggedIn}
                className='cursor-pointer'
              />
            </label>
            <Button variant='primary' onClick={() => router.push('/community/write')} className='h-8 w-25 px-5' disabled={!isLoggedIn}>
              글쓰기
            </Button>
          </div>
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'recent' | 'oldest' | 'popular')}>
            <SelectTrigger className='mt-2 h-5 w-[100px]'>
              <SelectValue placeholder='최신순' />
            </SelectTrigger>
            <SelectContent align='start'>
              <SelectItem value='recent'>최신순</SelectItem>
              <SelectItem value='oldest'>오래된순</SelectItem>
              <SelectItem value='popular'>인기순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 콘텐츠 */}
      {loading && <Loading />}
      {error && <Error />}
      {!loading && !error && (
        <>
          {!sortedPosts.length ? (
            <div className='flex h-[60vh] w-full items-center justify-center'>
              <span className='text-2xl text-gray-500'>등록된 글이 없습니다.</span>
            </div>
          ) : (
            <div className='grid grid-cols-1 justify-items-center gap-15 md:grid-cols-2 lg:grid-cols-3'>
              {sortedPosts.map((post) => (
                <div key={post.id} className='w-full'>
                  <Card className='mx-auto flex cursor-pointer flex-col' onClick={() => router.push(`/community/${post.id}`)}>
                    {/* 1. 이미지*/}
                    <div className='relative w-full overflow-hidden rounded-t-lg'>
                      <div className='absolute top-2 right-2 z-10' onClick={(e) => e.stopPropagation()}>
                        <BookmarkButton type='post' targetId={Number(post.id)} myBookmarkId={post.myBookmarkId ?? undefined} onBookmarkChange={(isBookmarked, bookmarkId) => handleBookmarkChange(post.id, isBookmarked, bookmarkId)} />
                      </div>
                      <CardImage src={post.coverImage} alt={post.title} priority />
                    </div>

                    {/* 2. 콘텐츠 */}
                    <CardContent className='flex flex-1 flex-col px-5 pb-5'>
                      {/* 타이틀+설명 */}
                      <div>
                        <CardTitle className='line-clamp-2' title={post.title} />
                        <CardDescription description={post.description} className='line-clamp-2 lg:!text-base' />
                      </div>

                      {/* 아바타+푸터: 항상 하단 고정 */}
                      <div className='mt-auto' onClick={(e) => e.stopPropagation()}>
                        <CardAvatar src={post.author.avatar} fallback={post.author.username.charAt(0)} username={post.author.username} />
                        <CardFooter likes={post.stats.bookmarks} comments={post.repliesCount ?? 0} views={post.stats.views} timeAgo={formatDate(post.createdAt)} onLike={() => {}} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
          {pagination.totalPages > 1 && (
            <div className='mt-8 flex justify-center'>
              <PaginationWrapper currentPage={pagination.page} totalPages={pagination.totalPages} setCurrentPage={handlePageChange} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
