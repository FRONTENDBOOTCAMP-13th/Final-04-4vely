import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import Link from 'next/link';

const navigation = [{ name: '주문관리', href: '/admin/orders' }];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen bg-gray-50'>
      {/* 상단 헤더 */}
      <header className='border-b border-gray-200 bg-white'>
        <div className='flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4'>
          <div className='flex items-center gap-3'>
            <Link href='/admin/orders' className='flex items-center gap-2'>
              <Image src='/icons/logo.svg' alt='Logo' width={200} height={0} className='h-auto w-20 -translate-y-1' />
              <p className='text-lg font-semibold text-gray-900'>관리자</p>
            </Link>
          </div>

          <div className='flex items-center gap-4'>
            {navigation.map((item) => (
              <Link key={item.name} href={item.href} className='rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900'>
                {item.name}
              </Link>
            ))}

            <div className='ml-4 flex items-center gap-2 border-l border-gray-200 pl-4 sm:gap-4'>
              <span className='hidden text-sm text-gray-500 sm:block'>Administrator</span>
              <Link href='/'>
                <Button variant='outline' size='sm' className='text-xs sm:text-sm'>
                  사이트로 이동
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className='flex-1'>{children}</main>
    </div>
  );
}
