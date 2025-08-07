'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { deletePostById } from '@/lib/functions/communityFunctions';
import { useAuth } from '@/store/authStore';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  postId: string;
  authorId: string;
}

export default function DeleteButton({ postId, authorId }: Props) {
  const router = useRouter();
  const { isLoggedIn, currentUser, session, zustandUser } = useAuth();
  const token = zustandUser?.token?.accessToken || session?.accessToken;

  // id, _id 둘 다 커버!
  const currentUserId = (currentUser && ('id' in currentUser ? currentUser.id : undefined)) ?? (currentUser && ('_id' in currentUser ? currentUser._id : undefined)) ?? '';
  const isAuthor = String(currentUserId) === String(authorId);

  const [resultDialog, setResultDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  const handleDelete = async () => {
    if (!isLoggedIn || !token) {
      setResultDialog({
        open: true,
        title: '인증이 필요합니다.',
        onConfirm: () => setResultDialog((p) => ({ ...p, open: false })),
      });
      return;
    }
    try {
      await deletePostById(postId, token!);
      setResultDialog({
        open: true,
        title: '게시글이 삭제되었습니다.',
        onConfirm: () => {
          setResultDialog((p) => ({ ...p, open: false }));
          router.push('/community');
        },
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      const isForbidden = [/403/, /forbidden/i].some((rx) => rx.test(errorMessage));
      setResultDialog({
        open: true,
        title: isForbidden ? '다른 사람의 게시물을 삭제할 수 없습니다.' : '삭제 중 오류가 발생했습니다.',
        description: isForbidden ? undefined : errorMessage,
        onConfirm: () => setResultDialog((p) => ({ ...p, open: false })),
      });
    }
  };

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant='destructive' size='sm' disabled={!isAuthor} className='disabled:cursor-not-allowed'>
            <Trash2 size={12} className='mr-1' />
            삭제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>정말 이 게시글을 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>삭제 후에는 복구할 수 없습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className='flex justify-end space-x-2'>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      <AlertDialog open={resultDialog.open} onOpenChange={(open) => setResultDialog((p) => ({ ...p, open }))}>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{resultDialog.title}</AlertDialogTitle>
              {resultDialog.description && <AlertDialogDescription>{resultDialog.description}</AlertDialogDescription>}
            </AlertDialogHeader>
            <AlertDialogFooter className='flex justify-end'>
              <AlertDialogAction onClick={resultDialog.onConfirm}>확인</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    </>
  );
}
