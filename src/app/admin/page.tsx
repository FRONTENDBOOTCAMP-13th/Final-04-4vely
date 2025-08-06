import { redirect } from 'next/navigation';

export default function MyPage() {
  redirect('/admin/orders');
  return null;
}
