import ClientDetail from '@/app/community/[id]/_components/ClientDetail';
import { fetchPostById } from '@/lib/functions/communityFunctions';
import { getBookmarkByTarget } from '@/lib/functions/shop/bookmarkServerFunctions';
import { notFound } from 'next/navigation';

export default async function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1) 게시글 데이터 가져오기
  const post = await fetchPostById(id).catch(() => null);
  if (!post) return notFound();

  // 2) 내 북마크 정보 가져오기
  const bookmark = await getBookmarkByTarget(Number(id), 'post');

  // 3) myBookmarkId 필드로 추가
  const postWithBookmark = {
    ...post,
    myBookmarkId: bookmark?._id ?? null,
  };

  return <ClientDetail post={postWithBookmark} />;
}
