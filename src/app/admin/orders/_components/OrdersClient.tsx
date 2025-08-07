'use client';

import { Button } from '@/components/ui/Button';
import PaginationWrapper from '@/components/ui/PaginationWrapper';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { updateOrderStatus } from '@/lib/actions/admin/orderActions';
import { Order } from '@/types/order.types';
import { ChevronDownIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface OrdersClientProps {
  initialOrders: Order[];
  initialPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  initialError?: string | null;
}

export default function OrdersClient({ initialOrders, initialPagination, initialError }: OrdersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [error] = useState<string | null>(initialError || null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // initialOrders가 변경될 때마다 orders 상태 업데이트
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // 상태 매핑 (클라이언트에서 처리)
  const STATUS_MAP = {
    OS020: '준비 중',
    OS035: '배송 중',
    OS040: '배송 완료',
  } as const;

  const STATUS_REVERSE_MAP = {
    '준비 중': 'OS020',
    '배송 중': 'OS035',
    '배송 완료': 'OS040',
  } as const;

  // 정렬 변경 핸들러
  const handleSortChange = (sortValue: string) => {
    const params = new URLSearchParams(searchParams);
    if (sortValue === 'newest') {
      params.delete('sort'); // 기본값이므로 삭제
    } else {
      params.set('sort', JSON.stringify({ createdAt: 1 })); // 오래된순
    }
    params.delete('page'); // 정렬 변경시 첫 페이지로
    const queryString = params.toString();
    router.push(`/admin/orders${queryString ? `?${queryString}` : ''}`);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', page.toString());
    }
    const queryString = params.toString();
    router.push(`/admin/orders${queryString ? `?${queryString}` : ''}`);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const statusCode = STATUS_REVERSE_MAP[newStatus as keyof typeof STATUS_REVERSE_MAP];
      const result = await updateOrderStatus(orderId, {
        state: statusCode,
      });

      if (result.ok) {
        // 성공시 로컬 상태 업데이트
        setOrders(orders.map((order) => (order._id.toString() === orderId ? { ...order, state: statusCode } : order)));
        toast.success('주문 상태가 변경되었습니다.');
      } else {
        toast.error('message' in result ? result.message : '주문 상태 변경에 실패했습니다.');
      }
    } catch {
      toast.error('주문 상태 변경에 실패했습니다.');
    } finally {
      setOpenDropdown(null);
    }
  };

  const StatusSelect = ({ orderId, currentStatus, size = 'default' }: { orderId: string; currentStatus: string; size?: 'sm' | 'default' }) => {
    const isOpen = openDropdown === orderId;
    const width = size === 'sm' ? '6rem' : '7rem';

    const statusOptions = [
      { value: '준비 중', label: '준비 중', hoverColor: 'rgba(249, 115, 22, 0.2)' },
      { value: '배송 중', label: '배송 중', hoverColor: 'rgba(59, 130, 246, 0.2)' },
      { value: '배송 완료', label: '배송 완료', hoverColor: 'rgba(34, 197, 94, 0.2)' },
    ];

    // 현재 상태를 한글로 표시
    const displayStatus = STATUS_MAP[currentStatus as keyof typeof STATUS_MAP] || currentStatus;

    // 드롭다운 위치 계산
    const getDropdownPosition = () => {
      if (typeof window === 'undefined') return { top: '100%', bottom: 'auto' };

      const button = document.querySelector(`[data-order-id="${orderId}"]`) as HTMLElement;
      if (!button) return { top: '100%', bottom: 'auto' };

      const rect = button.getBoundingClientRect();
      const dropdownHeight = statusOptions.length * 40 + 8; // 대략적인 드롭다운 높이
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // 아래쪽 공간이 충분하거나, 위쪽보다 아래쪽이 더 넓으면 아래로
      if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
        return { top: '100%', bottom: 'auto' };
      } else {
        // 위쪽에 공간이 더 많으면 위로
        return { top: 'auto', bottom: '100%', marginBottom: '0.25rem' };
      }
    };

    const dropdownPosition = isOpen ? getDropdownPosition() : { top: '100%', bottom: 'auto' };

    return (
      <div className='relative' style={{ width, zIndex: isOpen ? 9999 : 'auto' }}>
        <button
          type='button'
          data-order-id={orderId}
          onClick={() => setOpenDropdown(isOpen ? null : orderId)}
          className='focus:ring-black-500 flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:border-gray-400 focus:border-black focus:ring-1 focus:outline-none'
          style={{ width, height: size === 'sm' ? '2rem' : '2.25rem' }}
        >
          <span>{displayStatus}</span>
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className='fixed inset-0 z-10' onClick={() => setOpenDropdown(null)} />
            <div
              className='absolute z-50 rounded-md border border-gray-200 bg-white shadow-lg'
              style={{
                width: width,
                position: 'absolute',
                top: dropdownPosition.top,
                bottom: dropdownPosition.bottom,
                left: 0,
                zIndex: 9999,
                marginTop: dropdownPosition.top === '100%' ? '0.25rem' : '0',
                marginBottom: dropdownPosition.marginBottom || '0',
              }}
            >
              {statusOptions.map((option) => (
                <button
                  type='button'
                  key={option.value}
                  onClick={() => handleStatusChange(orderId, option.value)}
                  className='block w-full cursor-pointer px-3 py-2 text-left text-sm first:rounded-t-md last:rounded-b-md'
                  style={{
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = option.hoverColor;
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <p className='mb-4 text-red-500'>{error}</p>
          <Button onClick={() => router.refresh()} variant='secondary'>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center text-gray-500'>주문 내역이 없습니다.</div>
      </div>
    );
  }

  // 현재 정렬 상태 가져오기
  const currentSort = searchParams.get('sort');
  const currentSortValue = currentSort ? (JSON.parse(currentSort).createdAt === 1 ? 'oldest' : 'newest') : 'newest';

  // 정렬 셀렉트 컴포넌트
  const SortSelect = () => {
    const [isOpen, setIsOpen] = useState(false);
    const sortOptions = [
      { value: 'newest', label: '최신순', icon: '↓' },
      { value: 'oldest', label: '오래된순', icon: '↑' },
    ];

    const currentOption = sortOptions.find((option) => option.value === currentSortValue) || sortOptions[0];

    return (
      <div className='relative inline-block'>
        <button
          type='button'
          onClick={() => setIsOpen(!isOpen)}
          className='focus:ring-black-500 flex cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:border-gray-400 focus:border-black focus:ring-1 focus:outline-none'
          style={{ width: '7rem', height: '2.25rem', cursor: 'pointer' }}
        >
          <div className='flex items-center gap-1'>
            <span>{currentOption.icon}</span>
            <span>{currentOption.label}</span>
          </div>
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className='fixed inset-0 z-10' onClick={() => setIsOpen(false)} />
            <div className='absolute right-0 z-20 mt-1 rounded-md border border-gray-200 bg-white shadow-lg' style={{ width: '7rem' }}>
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  type='button'
                  onClick={() => {
                    handleSortChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`block w-full cursor-pointer px-3 py-2 text-left text-sm first:rounded-t-md last:rounded-b-md hover:bg-gray-50 ${option.value === currentSortValue ? 'bg-gray-50 text-black' : ''}`}
                >
                  <span className='mr-2'>{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className='w-full max-w-full'>
      {/* 상단 컴트롤 바 */}
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <h2 className='text-lg font-semibold text-gray-900'>주문 관리</h2>
        <div className='flex justify-end sm:justify-start'>
          <SortSelect />
        </div>
      </div>

      {/* 주문 목록 */}
      <div className='w-full max-w-full rounded-lg border border-gray-200 bg-white' style={{ overflow: 'visible' }}>
        {/* 모바일 레이아웃 */}
        <div className='block md:hidden'>
          <div className='divide-y divide-gray-200'>
            {orders.map((order) => (
              <div key={order._id} className='p-3 sm:p-4'>
                <div className='mb-3 space-y-2'>
                  {/* 상품명과 금액 */}
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0 flex-1'>
                      <p className='line-clamp-2 text-sm font-medium break-words text-gray-900'>
                        {order.products[0]?.name || '상품명 없음'}
                        {order.products.length > 1 && ` 외 ${order.products.length - 1}건`}
                      </p>
                    </div>
                    <div className='flex-shrink-0'>
                      <p className='text-sm font-medium whitespace-nowrap text-gray-900'>{order.cost.total.toLocaleString()}원</p>
                    </div>
                  </div>

                  {/* 주문 정보 */}
                  <div className='space-y-1'>
                    <p className='text-xs break-all text-gray-500'>#{order._id}</p>
                    <p className='text-xs text-gray-500'>{order.createdAt}</p>
                    <p className='text-xs break-words text-gray-500'>주문자: {order.address?.name || `사용자 ${order.user_id}`}</p>
                  </div>
                </div>

                {/* 상태 선택 */}
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium text-gray-600'>진행상태</span>
                  <StatusSelect orderId={order._id.toString()} currentStatus={order.state} size='sm' />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 데스크톱 테이블 */}
        <div className='hidden md:block' style={{ overflow: 'visible' }}>
          <div className='relative w-full' style={{ overflow: 'visible' }}>
            <div className='overflow-x-auto' style={{ overflow: openDropdown ? 'visible' : 'auto' }}>
              <table className='w-full min-w-[50rem] caption-bottom text-sm'>
                <TableHeader className='bg-gray-50'>
                  <TableRow className='hover:bg-gray-50'>
                    <TableHead className='px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase'>주문번호</TableHead>
                    <TableHead className='px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase'>상품명</TableHead>
                    <TableHead className='px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase'>주문일자</TableHead>
                    <TableHead className='px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase'>주문자</TableHead>
                    <TableHead className='px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase'>진행상태</TableHead>
                    <TableHead className='px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase'>주문금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className='bg-white'>
                  {orders.map((order) => (
                    <TableRow key={order._id} className='hover:bg-gray-50'>
                      <TableCell className='px-6 py-4 text-sm text-gray-900'>{order._id}</TableCell>
                      <TableCell className='px-6 py-4 text-sm font-medium text-gray-900'>
                        {order.products[0]?.name || '상품명 없음'}
                        {order.products.length > 1 && ` 외 ${order.products.length - 1}건`}
                      </TableCell>
                      <TableCell className='px-6 py-4 text-sm text-gray-900'>{order.createdAt}</TableCell>
                      <TableCell className='px-6 py-4 text-sm text-gray-900'>{order.address?.name || `사용자 ${order.user_id}`}</TableCell>
                      <TableCell className='px-6 py-4'>
                        <StatusSelect orderId={order._id.toString()} currentStatus={order.state} size='default' />
                      </TableCell>
                      <TableCell className='px-6 py-4 text-sm font-medium text-gray-900'>{order.cost.total.toLocaleString()}원</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </div>
          </div>
        </div>

        {/* 페이지네이션 */}
        {initialPagination.totalPages > 1 && (
          <div className='flex items-center justify-center border-t border-gray-200 bg-white p-3 sm:px-6 sm:py-4'>
            <PaginationWrapper currentPage={initialPagination.page} totalPages={initialPagination.totalPages} setCurrentPage={handlePageChange} />
          </div>
        )}
      </div>
    </div>
  );
}
