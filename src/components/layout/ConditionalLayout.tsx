'use client';

import Notice from '@/app/notice';
import ActivityTracker from '@/components/layout/ActivityTracker';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import { usePathname } from 'next/navigation';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Notice />
      <Header />
      <ActivityTracker />
      {children}
      <Footer />
    </>
  );
}
