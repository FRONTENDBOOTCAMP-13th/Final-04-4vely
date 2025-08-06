'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import DeleteButton from '@/app/community/[id]/_components/DeleteButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

import UpdateButton from '@/app/community/[id]/_components/UpdateButton';
import { formatDate } from '@/app/my-page/my-plants/_utils/diaryUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/AlertDialog';
import BookmarkButton from '@/components/ui/BookmarkButton';
import { createComment, deleteComment, fetchComments, updateComment } from '@/lib/functions/communityFunctions';
import { useAuth } from '@/store/authStore';
import { CommunityComment, Post } from '@/types/commnunity.types';
import { Eye, Heart, MessageCircle } from 'lucide-react';

export default function ClientDetail({ post }: { post: Post }) {
  const { id, title, coverImage, contents, author, createdAt, stats, name, nickname, species } = post;
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; commentId: string | null }>({ open: false, commentId: null });
  const { isLoggedIn, zustandUser, session } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const currentUserId = zustandUser?._id || session?.id;
  const token = zustandUser?.token?.accessToken || session?.accessToken;

  useEffect(() => {
    const loadComments = async () => {
      try {
        const res = await fetchComments(id);
        setComments(res);
      } catch (e) {
        console.error('댓글 로드 실패', e);
      }
    };
    loadComments();
  }, [id]);

  const handleCommentSubmit = async () => {
    if (!input.trim() || !isLoggedIn || !token) return;
    setLoading(true);
    try {
      const newComment = await createComment(id, input, token);
      setComments((prev) => [...prev, newComment]);
      setInput('');
    } catch (e) {
      console.error('댓글 작성 실패', e);
    } finally {
      setLoading(false);
    }
  };

  // 댓글 수정
  async function handleUpdate(commentId: string) {
    if (!editingContent.trim() || !isLoggedIn || !token) return;
    const updated = await updateComment(id, commentId, editingContent, token);
    setComments((cs) => cs.map((c) => (c._id === commentId ? updated : c)));
    setEditingId(null);
  }

  // 댓글 삭제
  async function handleDelete(commentId: string) {
    setDeleteDialog({ open: true, commentId });
  }
  async function confirmDelete() {
    if (!token || !deleteDialog.commentId) return;
    await deleteComment(id, deleteDialog.commentId, token);
    setComments((cs) => cs.filter((c) => c._id !== deleteDialog.commentId));
    setDeleteDialog({ open: false, commentId: null });
  }

  return (
    <div className='overflow-x-hidden'>
      {/* 대표 이미지 */}
      <div className='relative h-50 w-full md:h-60'>{coverImage && <Image src={coverImage} alt='대표 이미지' fill sizes='(max-width: 640px) 100vw, 640px' priority className='object-cover' />}</div>

      <main className='mx-auto w-full max-w-4xl px-4 py-10 md:p-6 lg:p-8'>
        {/* 제목 및 메타 영역 */}
        <section className='mb-10'>
          <h1 className='mb-4 text-xl font-semibold md:text-2xl'>{title}</h1>

          <div className='mt-4 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Avatar className='h-8 w-8'>{author.avatar ? <AvatarImage src={author.avatar} alt={author.username} /> : <AvatarFallback>{author.username.charAt(0)}</AvatarFallback>}</Avatar>
              <span>{author.username}</span>
            </div>

            <div className='flex flex-col items-end space-y-2 text-sm'>
              <span>{formatDate(createdAt)}</span>
              <div className='flex items-center gap-2'>
                <UpdateButton postId={id} />
                <DeleteButton postId={id} />
              </div>
            </div>
          </div>
        </section>
        <hr className='mb-10 border-gray-300' />

        {/* 정보테이블 */}
        <section className='mb-10 rounded-3xl'>
          <div className='overflow-hidden rounded border bg-white'>
            <table className='w-full border-collapse text-sm'>
              <tbody>
                <tr className='border-b'>
                  <th className='w-24 bg-neutral-50 px-4 py-3 text-left font-medium'>이름</th>
                  <td className='px-4 py-3'>{name}</td>
                </tr>
                <tr className='border-b'>
                  <th className='w-24 bg-neutral-50 px-4 py-3 text-left font-medium'>애칭</th>
                  <td className='px-4 py-3'>{nickname ?? '-'}</td>
                </tr>
                <tr>
                  <th className='w-24 bg-neutral-50 px-4 py-3 text-left font-medium'>종류</th>
                  <td className='px-4 py-3'>{species ?? '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 콘텐츠 블록들 */}
        {contents.map((block) => (
          <section key={block.id} className='mx-auto mb-15 max-w-[50rem] px-5 text-center'>
            {block.postImage && (
              <div className='relative mx-auto mb-10 aspect-[3/4] max-w-[30rem] overflow-hidden rounded-xl border'>
                <Image src={block.postImage} alt={'첨부 이미지'} fill priority className='object-cover' />
              </div>
            )}
            {block.content && (
              <p className='mx-auto mt-15 text-center leading-8 sm:max-w-[55ch] md:max-w-[60ch] lg:max-w-[65ch] lg:text-lg'>
                {block.content.split('.').map((sentence, idx, arr) =>
                  sentence.trim() ? (
                    <span key={idx} className='inline-block'>
                      {sentence.trim()}
                      {idx < arr.length - 1 && '.'}
                      <br />
                    </span>
                  ) : null,
                )}
              </p>
            )}
          </section>
        ))}

        {/* 액션 영역 */}
        <section className='mb-8'>
          <hr className='mb-4 border-gray-300' />
          <div className='flex items-center gap-8 text-sm text-neutral-700'>
            <span className='flex items-center gap-1'>
              <Heart className='text-red-400' size={14} />
              <span>{post.stats.bookmarks}</span>
            </span>
            <span className='flex items-center gap-1'>
              <MessageCircle size={14} />
              <span>{comments.length}</span>
            </span>
            <span className='flex items-center gap-1'>
              <Eye size={14} />
              <span>{stats.views}</span>
            </span>
            <BookmarkButton type='post' targetId={Number(post.id)} myBookmarkId={post.myBookmarkId ?? undefined} onBookmarkChange={() => {}} className='ml-auto' revalidate={false} variant='text' />
          </div>
        </section>

        {/* 댓글 입력 및 리스트 */}
        <section className='mb-10'>
          <h3 className='mb-3 text-sm font-semibold'>댓글 목록</h3>
          <div className='flex items-start gap-4'>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder='칭찬과 격려의 댓글은 작성자에게 큰 힘이 됩니다 :) 2줄까지' className='h-12 flex-1 resize-none rounded border border-gray-400 px-3 py-2 text-sm' />
            <Button onClick={handleCommentSubmit} disabled={loading || !isLoggedIn || !token} variant='primary'>
              등록
            </Button>
          </div>
        </section>

        <section className='space-y-6'>
          {comments.length === 0 ? (
            <p className='text-center text-gray-500'>아직 아무 댓글도 없습니다. 첫 댓글을 남겨보세요!</p>
          ) : (
            comments.map((comment: CommunityComment) => (
              <div key={comment._id} className='flex gap-3'>
                <Avatar className='h-9 w-9 shrink-0'>{comment.user.image ? <AvatarImage src={comment.user.image} alt={comment.user.name} /> : <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>}</Avatar>
                <div className='flex-1'>
                  <div className='mb-1 flex items-center justify-between gap-2'>
                    <span className='text-sm font-medium'>{comment.user.name}</span>
                    {String(comment.user._id) === String(currentUserId) &&
                      (editingId === comment._id ? (
                        <div className='flex gap-2'>
                          <Button size='sm' onClick={() => handleUpdate(comment._id)}>
                            저장
                          </Button>
                          <Button size='sm' variant='ghost' onClick={() => setEditingId(null)}>
                            취소
                          </Button>
                        </div>
                      ) : (
                        <div className='flex gap-2'>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => {
                              setEditingId(comment._id);
                              setEditingContent(comment.content);
                            }}
                          >
                            수정
                          </Button>
                          <Button size='sm' variant='ghost' className='text-red-500' onClick={() => handleDelete(comment._id)}>
                            삭제
                          </Button>
                        </div>
                      ))}
                  </div>

                  {editingId === comment._id ? (
                    <textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} className='mb-2 w-full resize-none rounded border px-3 py-2 text-base' />
                  ) : (
                    <div className='p-4 text-base leading-relaxed whitespace-pre-wrap'>{comment.content}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
        {/* 댓글 삭제 확인 다이얼로그 */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter className='justify-end space-x-2'>
              <AlertDialogCancel onClick={() => setDeleteDialog({ open: false, commentId: null })}>취소</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
