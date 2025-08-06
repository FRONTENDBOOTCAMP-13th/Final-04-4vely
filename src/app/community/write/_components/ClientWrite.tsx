'use client';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { createPost, uploadFile } from '@/lib/functions/communityFunctions';
import { useAuth } from '@/store/authStore';
import { Plus, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';

interface PostForm {
  id: string;
  title: string;
  content: string;
  postImage: File | null;
  thumbnailImage: File | null;
}

const MAX_FORMS = 10;

export default function ClientWrite() {
  const router = useRouter();
  const { zustandUser, session } = useAuth();
  const token = zustandUser?.token?.accessToken || session?.accessToken;

  // cover 파일 + preview URL
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [postForms, setPostForms] = useState<PostForm[]>([{ id: '1', title: '', content: '', postImage: null, thumbnailImage: null }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [species, setSpecies] = useState('');
  const [nameError, setNameError] = useState(false);

  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  // cover input change → Blob URL 생성/해제
  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCover(file);

    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
      setCoverPreview(null);
    }
    if (file) {
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  // 언마운트 시 preview URL 해제
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const updatePostForm = (formId: string, field: keyof PostForm, value: string | File | null) => {
    setPostForms((prev) => prev.map((f) => (f.id === formId ? { ...f, [field]: value } : f)));
  };

  const addNewForm = () => {
    if (postForms.length >= MAX_FORMS) return;
    setPostForms((prev) => [...prev, { id: Date.now().toString(), title: '', content: '', postImage: null, thumbnailImage: null }]);
  };

  const removePostForm = (formId: string) => {
    if (postForms.length <= 1) return;
    setPostForms((prev) => prev.filter((f) => f.id !== formId));
  };

  const handleSubmit = async () => {
    const hasBodyImage = postForms.some((f) => f.postImage);
    if (!cover && !hasBodyImage) {
      setDialog({
        open: true,
        title: '이미지를 업로드해주세요.',
        onConfirm: () => setDialog((d) => ({ ...d, open: false })),
      });
      return;
    }
    const first = postForms[0];
    if (!first.title.trim()) {
      setDialog({
        open: true,
        title: '제목을 입력해주세요.',
        onConfirm: () => setDialog((d) => ({ ...d, open: false })),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1) 커버 업로드
      const coverUrl = cover ? await uploadFile(cover) : '';

      // 2) 본문 이미지 업로드
      const contentsPayload = await Promise.all(
        postForms.map(async (f) => {
          const postImageUrl = f.postImage ? await uploadFile(f.postImage) : '';
          const thumbUrl = f.thumbnailImage ? await uploadFile(f.thumbnailImage) : '';
          return {
            id: f.id,
            title: f.title,
            content: f.content,
            postImage: postImageUrl,
            thumbnailImage: thumbUrl,
          };
        }),
      );

      // 3) 서버 호출
      await createPost(
        {
          type: 'community',
          title: first.title,
          content: first.content,
          image: coverUrl || contentsPayload[0]?.postImage || '',
          extra: { contents: contentsPayload, name, nickname, species },
        },
        token,
      );

      // 4) 성공 다이얼로그
      setDialog({
        open: true,
        title: '작성 완료',
        description: '글이 성공적으로 작성되었습니다.',
        onConfirm: () => {
          setDialog((d) => ({ ...d, open: false }));
          router.push('/community');
          router.refresh();
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '작성에 실패했습니다.';
      setDialog({
        open: true,
        title: '오류 발생',
        description: msg,
        onConfirm: () => setDialog((d) => ({ ...d, open: false })),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <main className='flex flex-col items-center space-y-12 pb-8'>
        {/* 대문 이미지 */}
        <section className='w-full text-gray-500'>
          <label htmlFor='cover-upload' className='block w-full cursor-pointer'>
            <div className='relative flex h-64 w-full items-center justify-center overflow-hidden border border-dashed border-gray-300 bg-white'>
              {coverPreview ? (
                <Image src={coverPreview} alt='cover preview' fill unoptimized className='object-cover' />
              ) : (
                <div className='flex flex-col items-center gap-1'>
                  <h2 className='text-2xl font-semibold'>대문 이미지 추가</h2>
                  <Plus size={90} className='text-gray-500' />
                </div>
              )}
            </div>
            <input id='cover-upload' type='file' accept='image/*' onChange={handleCoverChange} className='hidden' disabled={isSubmitting} />
          </label>
        </section>

        {/* 제목 */}
        <h1 className='w-full max-w-4xl px-4 text-3xl font-bold'>글쓰기</h1>

        {/* 정보 입력 */}
        <section className='mb-8 w-full max-w-4xl rounded-3xl bg-teal-50 p-6'>
          <h3 className='mb-4 text-lg font-semibold'>정보</h3>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
            {/* 식물이름 (필수) */}
            <div className='flex flex-col'>
              <label htmlFor='name' className={`flex items-center text-sm font-medium ${nameError ? 'text-red-500' : 'text-gray-700'}`}>
                식물이름<span className='ml-1 text-red-500'>*</span>
              </label>
              <input
                id='name'
                type='text'
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(false);
                }}
                onBlur={() => {
                  if (!name.trim()) setNameError(true);
                }}
                placeholder='예: 안스리움'
                disabled={isSubmitting}
                className={`mt-1 h-10 min-w-[160px] rounded border px-3 text-sm transition focus:ring-2 focus:ring-green-400 focus:outline-none ${nameError ? 'border-red-500' : 'border-gray-300 hover:border-green-500'}`}
              />
              {nameError && <p className='mt-1 text-xs text-red-500'>식물 이름을 입력해주세요.</p>}
            </div>

            {/* 애칭 */}
            <div className='flex flex-col'>
              <label htmlFor='nickname' className='text-sm font-medium text-gray-700'>
                애칭
              </label>
              <input
                id='nickname'
                type='text'
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder='애칭을 입력하세요'
                disabled={isSubmitting}
                className='mt-1 h-10 min-w-[140px] rounded border border-gray-300 px-3 text-sm transition hover:border-green-500 focus:ring-2 focus:ring-green-400 focus:outline-none'
              />
            </div>

            {/* 종류 */}
            <div className='flex flex-col'>
              <label htmlFor='species' className='text-sm font-medium text-gray-700'>
                종류
              </label>
              <input
                id='species'
                type='text'
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                placeholder='종류를 입력하세요'
                disabled={isSubmitting}
                className='mt-1 h-10 min-w-[140px] rounded border border-gray-300 px-3 text-sm transition hover:border-green-500 focus:ring-2 focus:ring-green-400 focus:outline-none'
              />
            </div>
          </div>
        </section>

        {/* 본문 섹션 */}
        <div className='flex w-full max-w-4xl flex-col gap-6 px-4 md:flex-row'>
          {/* 썸네일 사이드 */}
          <div className='hidden flex-col items-end gap-4 md:flex'>
            {postForms.map((form) => (
              <div key={form.id}>
                {form.thumbnailImage ? (
                  <div className='relative h-20 w-20 overflow-hidden rounded-lg border border-gray-300'>
                    <Image src={URL.createObjectURL(form.thumbnailImage)} alt='thumbnail' fill unoptimized className='object-cover' />
                  </div>
                ) : (
                  <div className='flex h-20 w-20 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-400'>
                    <Plus size={24} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 글쓰기 폼 */}
          <div className='flex-1 space-y-6 bg-teal-50'>
            {postForms.map((form, idx) => (
              <section key={form.id} className='rounded-lg border p-4 transition hover:shadow-md'>
                {idx === 0 ? (
                  <div className='mb-6 flex items-center gap-4'>
                    <input
                      type='text'
                      placeholder='제목을 입력해주세요.'
                      maxLength={80}
                      value={form.title}
                      onChange={(e) => updatePostForm(form.id, 'title', e.target.value)}
                      className='h-12 flex-1 rounded-lg border border-gray-300 px-4 transition hover:border-green-500 focus:ring-2 focus:ring-green-400 focus:outline-none'
                      disabled={isSubmitting}
                    />
                    <Button variant='destructive' onClick={() => removePostForm(form.id)} disabled={isSubmitting || postForms.length === 1}>
                      삭제
                    </Button>
                  </div>
                ) : (
                  <div className='mb-4 flex justify-end'>
                    <Button variant='destructive' onClick={() => removePostForm(form.id)} disabled={isSubmitting}>
                      삭제
                    </Button>
                  </div>
                )}

                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                  {/* 이미지 업로드 */}
                  <div className='relative min-h-[200px] overflow-hidden rounded-lg border border-gray-300 bg-gray-100 transition hover:border-green-500'>
                    <label htmlFor={`post-upload-${form.id}`} className='absolute inset-0 flex cursor-pointer items-center justify-center text-gray-400'>
                      {!form.postImage && (
                        <div className='text-center'>
                          <h1 className='mb-2 text-lg font-medium'>사진 첨부</h1>
                          <Plus size={58} />
                        </div>
                      )}
                    </label>
                    <input
                      id={`post-upload-${form.id}`}
                      type='file'
                      accept='image/*'
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        updatePostForm(form.id, 'postImage', file);
                        updatePostForm(form.id, 'thumbnailImage', file);
                      }}
                      className='hidden'
                      disabled={isSubmitting}
                    />
                    {form.postImage && (
                      <>
                        <Image src={URL.createObjectURL(form.postImage)} alt='post image' fill unoptimized className='object-cover' />
                        <button
                          type='button'
                          onClick={() => {
                            updatePostForm(form.id, 'postImage', null);
                            updatePostForm(form.id, 'thumbnailImage', null);
                          }}
                          className='absolute top-2 right-2 text-gray-400 transition hover:text-gray-600'
                          disabled={isSubmitting}
                        >
                          <X size={20} />
                        </button>
                      </>
                    )}
                  </div>

                  <textarea
                    placeholder='내용을 입력해주세요.'
                    value={form.content}
                    onChange={(e) => updatePostForm(form.id, 'content', e.target.value)}
                    className='min-h-[200px] w-full resize-none rounded-lg border border-gray-300 bg-white p-4 transition hover:border-green-500 focus:ring-2 focus:ring-green-400 focus:outline-none'
                    disabled={isSubmitting}
                  />
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className='flex w-full max-w-4xl items-center justify-between px-4 md:pl-33'>
          <div className='flex items-center gap-3'>
            <Button onClick={addNewForm} disabled={isSubmitting || postForms.length >= MAX_FORMS} className='flex items-center gap-1'>
              추가하기{' '}
              <span className='text-sm text-gray-600'>
                ({postForms.length}/{MAX_FORMS})
              </span>
            </Button>
          </div>
          <div className='flex gap-2'>
            <Button variant='secondary' onClick={() => router.push('/community')} disabled={isSubmitting}>
              취소
            </Button>
            <Button variant='primary' onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? '작성 중...' : '작성하기'}
            </Button>
          </div>
        </div>
      </main>

      {/* 다이얼로그 */}
      <AlertDialog open={dialog.open} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}>
        <AlertDialogContent className='fixed w-[90%] max-w-md -translate-x-1/2'>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
            {dialog.description && <AlertDialogDescription>{dialog.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter className='justify-end space-x-2'>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={dialog.onConfirm}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
