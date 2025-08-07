import Image from 'next/image';
import LoginForm from './_components/LoginForm';
import LoginToast from './_components/LoginToast';

export default function LoginPage() {
  return (
    <>
      <LoginToast />
      <div className='mb-15 flex w-full flex-col items-center p-4 md:p-6 lg:p-8'>
        <h1 className='t-h1 mt-5'>
          <span className='text-accent'>작은 초록,</span> 당신의 하루를 반짝이게.
        </h1>
        <p className='text-muted mb-10 flex items-center gap-2 md:text-lg'>
          당신의 반려 식물을 지금 만나보세요.
          <Image className='h-8 w-4 md:h-10 md:w-5' width={20} height={40} src='/images/login_plant_character.webp' alt='식물 캐릭터' />
        </p>

        <LoginForm />
      </div>
    </>
  );
}
