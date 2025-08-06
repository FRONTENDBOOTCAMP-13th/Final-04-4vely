import ConditionalLayout from '@/components/layout/ConditionalLayout';
import '@/styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import localFont from 'next/font/local';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Green Mate',
  description: 'Green Mate',
  icons: {
    icon: '/favicon.svg',
  },
};

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <html lang='ko' className={pretendard.variable}>
        <body className={`${pretendard.className} bg-surface`}>
          <main>
            <Toaster
              position='top-center'
              richColors={true}
              theme='light'
              closeButton={false}
              toastOptions={{
                duration: 2500,
                style: {
                  fontFamily: 'var(--font-pretendard)',
                },
              }}
            />
            <ConditionalLayout>{children}</ConditionalLayout>
          </main>
        </body>
      </html>
    </SessionProvider>
  );
}
