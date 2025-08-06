import { getOrders } from '@/lib/actions/admin/orderActions';
import { redirect } from 'next/navigation';
import OrdersClient from './_components/OrdersClient';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.page || '1', 10);
  const sortParam = resolvedSearchParams.sort;

  // 기본 정렬: 최신순 (createdAt: -1)
  let sortOrder = { createdAt: -1 };
  if (sortParam) {
    try {
      sortOrder = JSON.parse(sortParam);
    } catch {
      // 잘못된 정렬 파라미터인 경우 기본값 사용
      sortOrder = { createdAt: -1 };
    }
  }

  // 서버에서 주문 데이터 가져오기
  const result = await getOrders({
    page: currentPage,
    limit: 10,
    sort: JSON.stringify(sortOrder),
  });

  // API 에러 처리
  if (!('item' in result) || !result.ok) {
    const errorMessage = 'message' in result ? result.message : '주문 목록을 불러오는데 실패했습니다.';

    return (
      <div className='min-h-screen bg-white p-4 sm:p-6'>
        <div className='mb-4 sm:mb-6'>
          <h1 className='mb-2 text-xl font-semibold text-gray-900 sm:text-2xl'>주문관리</h1>
          <p className='text-sm text-gray-600'>온라인 쇼핑몰에서 발생하는 주문건들을 관리합니다.</p>
        </div>
        <OrdersClient
          initialOrders={[]}
          initialPagination={{
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          }}
          initialError={errorMessage}
        />
      </div>
    );
  }

  // 잘못된 페이지 접근시 리디렉트
  if (currentPage < 1 || currentPage > result.pagination.totalPages) {
    redirect('/admin/orders');
  }

  return (
    <div className='min-h-screen bg-white p-4 sm:p-6'>
      <div className='mb-4 sm:mb-6'>
        <h1 className='mb-2 text-xl font-semibold text-gray-900 sm:text-2xl'>주문관리</h1>
        <p className='text-sm text-gray-600'>Green Mate에서 발생하는 주문건들을 관리합니다.</p>
      </div>
      <OrdersClient initialOrders={result.item} initialPagination={result.pagination} />
    </div>
  );
}
