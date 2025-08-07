'use client';

import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/AlertDialog';
import { useEffect, useState } from 'react';

const NOTICE_KEY = 'GreenmateNotice';

export default function Notice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // sessionStorage로 변경
    try {
      const agreed = sessionStorage.getItem(NOTICE_KEY);
      if (agreed !== 'true') {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const handleAgree = () => {
    try {
      sessionStorage.setItem(NOTICE_KEY, 'true');
    } catch (e) {
      console.warn('면책 조항 동의 정보를 저장할 수 없습니다.', e);
    }
    setOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <div className='mb-2 flex items-center gap-2'>
          <span className='text-2xl'>🦁</span>
          <AlertDialogTitle>멋쟁이사자처럼 학습 프로젝트</AlertDialogTitle>
        </div>
        <AlertDialogDescription>본 웹사이트는 멋쟁이사자처럼 프론트엔드 교육과정의 학습 프로젝트입니다.</AlertDialogDescription>

        <div className='my-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800'>
          <div className='mb-2 font-medium'>[면책 조항]</div>
          <ul className='list-inside list-disc space-y-1'>
            <li>교육 목적으로 제작된 비상업적 프로젝트입니다.</li>
            <li>사이트에 포함된 정보는 정확성이나 완전성을 보장하지 않습니다.</li>
            <li>표시된 상품, 서비스, 가격 등은 실제로 제공되지 않을 수 있습니다.</li>
            <li>제3자 콘텐츠가 포함될 수 있으며, 해당 저작권은 원 소유자에게 있습니다.</li>
          </ul>
        </div>
        <div className='mb-2 text-sm'>확인 버튼을 클릭하시면 이 내용에 동의하신 것으로 간주됩니다. 즐거운 탐색 되세요!</div>
        <AlertDialogFooter>
          <AlertDialogAction className='w-full' onClick={handleAgree} autoFocus>
            확인
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
