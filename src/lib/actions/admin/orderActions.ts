'use server';

import { ApiRes } from '@/types/api.types';
import { Order } from '@/types/order.types';
import { getAuthInfo } from '@/lib/utils/auth.server';

const API_URL = process.env.API_SERVER || 'https://fesp-api.koyeb.app/market';
const CLIENT_ID = process.env.CLIENT_ID || 'febc13-final04-emjf';

interface OrdersResponse {
  ok: 1;
  item: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiError {
  ok: 0;
  message: string;
  errorName?: string;
}

// 주문 목록 조회
export async function getOrders(
  params: {
    user_id?: number;
    state?: string;
    custom?: string;
    page?: number;
    limit?: number;
    sort?: string;
  } = {},
): Promise<OrdersResponse | ApiError> {
  try {
    // 인증 정보 가져오기
    const authInfo = await getAuthInfo();
    if (!authInfo) {
      return {
        ok: 0,
        message: '인증이 필요합니다. 다시 로그인해주세요.',
        errorName: 'UnauthorizedError',
      };
    }

    const queryParams = new URLSearchParams();

    if (params.user_id) queryParams.set('user_id', params.user_id.toString());
    if (params.state) queryParams.set('state', params.state);
    if (params.custom) queryParams.set('custom', params.custom);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.sort) queryParams.set('sort', params.sort);

    const url = `${API_URL}/seller/orders/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'client-id': CLIENT_ID,
        Authorization: `Bearer ${authInfo.accessToken}`,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: 0,
        message: data.message || '주문 목록을 불러오는데 실패했습니다.',
        errorName: data.errorName,
      };
    }

    return data;
  } catch (error) {
    console.error('주문 목록 조회 오류:', error);
    return {
      ok: 0,
      message: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    };
  }
}

// 주문 상태 업데이트
export async function updateOrderStatus(
  orderId: string,
  updateData: {
    state: string;
    memo?: string;
    delivery?: {
      company: string;
      trackingNumber: string;
      url: string;
    };
  },
): Promise<ApiRes<Order>> {
  try {
    // 인증 정보 가져오기
    const authInfo = await getAuthInfo();
    if (!authInfo) {
      return {
        ok: 0,
        message: '인증이 필요합니다. 다시 로그인해주세요.',
      };
    }

    const url = `${API_URL}/seller/orders/${orderId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'client-id': CLIENT_ID,
        Authorization: `Bearer ${authInfo.accessToken}`,
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: 0,
        message: data.message || '주문 상태 업데이트에 실패했습니다.',
      };
    }

    return data;
  } catch (error) {
    console.error('주문 상태 업데이트 오류:', error);
    return {
      ok: 0,
      message: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    };
  }
}
