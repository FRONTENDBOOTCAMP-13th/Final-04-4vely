import Image from 'next/image';
import RouteChangeHandler from './_components/common/RouteChangeHandler';

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RouteChangeHandler />
      <div className='mb-15 flex w-full flex-col items-center p-4 md:p-6 lg:p-8'>
        <h1 className='t-h1 mt-5'>
          <span className='text-accent'>작은 초록,</span> 당신의 하루를 반짝이게.
        </h1>
        <p className='text-muted mb-10 flex items-center gap-2 md:text-lg'>
          당신의 반려 식물을 지금 만나보세요.
          <Image className='h-8 w-4 md:h-10 md:w-5' src='/images/sign_up_plant_character.webp' alt='식물 캐릭터' />
        </p>

        {children}
      </div>
    </>
  );
}

export function generateMetadata() {
  return {
    title: '회원가입 - Green Mate',
    description: 'Green Mate에서 당신의 반려 식물을 만나보세요.',
  };
}
