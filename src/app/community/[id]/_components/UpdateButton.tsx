'use client';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/authStore';
import { Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  postId: string;
  authorId: string;
}

export default function UpdateButton({ postId, authorId }: Props) {
  const router = useRouter();
  const { isLoggedIn, currentUser } = useAuth();

  // id, _id 모두 체크!
  const currentUserId = (currentUser && ('id' in currentUser ? currentUser.id : undefined)) ?? (currentUser && ('_id' in currentUser ? currentUser._id : undefined)) ?? '';
  const isAuthor = String(currentUserId) === String(authorId);

  const handleEdit = () => {
    if (!isLoggedIn) return alert('로그인이 필요합니다.');
    if (!isAuthor) return alert('다른 사람의 게시물을 수정할 수 없습니다.');
    router.push(`/community/${postId}/edit`);
  };

  return (
    <Button variant='default' size='sm' onClick={handleEdit} disabled={!isAuthor} className='disabled:cursor-not-allowed'>
      <Pencil size={12} className='mr-1' />
      수정
    </Button>
  );
}
