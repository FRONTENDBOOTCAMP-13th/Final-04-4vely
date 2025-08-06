// src/lib/actions/order/orderSchedulerActions.ts

'use server';

const API_URL = process.env.API_URL || '';
const CLIENT_ID = process.env.CLIENT_ID || '';
const APP_BASE_URL = process.env.APP_BASE_URL || '';

/**
 * 스케줄러용 판매자 로그인하여 토큰 획득
 * @returns {Promise<string | null>} 액세스 토큰 또는 null
 */
async function getSellerToken(): Promise<string | null> {
  try {
    // 판매자 계정 정보 - 환경변수에서 가져오거나 기본값 사용
    const sellerCredentials = {
      email: process.env.SCHEDULER_SELLER_EMAIL || '',
      password: process.env.SCHEDULER_SELLER_PASSWORD || '',
    };

    const response = await fetch(`${API_URL}/users/login?expiresIn=1d`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-id': CLIENT_ID,
      },
      body: JSON.stringify(sellerCredentials),
    });

    if (!response.ok) {
      console.error('판매자 로그인 실패:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.ok === 1 && data.item?.token?.accessToken) {
      const token = data.item.token.accessToken;
      return token;
    }
    return null;
  } catch (error) {
    console.error('판매자 로그인 중 오류:', error);
    return null;
  }
}

/**
 * 주문 시간에 따라 배송중 상태로 변경할 시간 계산 (테스트용: 30초 후)
 * @param {Date} orderTime - 주문 시간
 * @returns {Date} 배송중 상태로 변경할 시간
 */
function calculateShippingTime(orderTime: Date): Date {
  const shippingTime = new Date(orderTime);

  // 테스트용: 주문 후 30초 뒤에 배송중으로 변경
  shippingTime.setTime(shippingTime.getTime() + 30 * 1000);

  return shippingTime;
}

/**
 * 배송 완료 시간 계산 (테스트용: 배송중 상태 후 30초)
 * @param {Date} shippingTime - 배송중 상태 시간
 * @returns {Date} 배송 완료 시간
 */
function calculateDeliveryCompleteTime(shippingTime: Date): Date {
  const completeTime = new Date(shippingTime);
  // 테스트용: 배송중 상태 후 30초 뒤에 배송 완료로 변경
  completeTime.setTime(completeTime.getTime() + 30 * 1000);
  return completeTime;
}

/**
 * 날짜를 스케줄러 API 형식으로 변환 (YYYY.MM.DD HH:mm:ss)
 * @param {Date} date - 변환할 날짜
 * @returns {string} 형식화된 시간 문자열
 */
function formatSchedulerTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 배송중 상태 변경 스케줄러 등록
 * @param {number} orderId - 주문 ID
 * @returns {Promise<boolean>} 스케줄러 등록 성공 여부
 */
export async function registerShippingStatusScheduler(orderId: number): Promise<boolean> {
  try {
    const orderTime = new Date();
    const shippingTime = calculateShippingTime(orderTime);
    const schedulerTime = formatSchedulerTime(shippingTime);

    // 외부 스케줄러에 배송중 상태 변경 등록
    const schedulerData = {
      name: `배송중 상태 변경 - 주문 #${orderId}`,
      description: `주문 #${orderId}를 배송중 상태(OS035)로 변경`,
      endpoint: `${APP_BASE_URL}/api/orders/${orderId}?action=shipping&status=OS035`,
      time: schedulerTime,
    };

    const response = await fetch(`${API_URL}/scheduler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-id': CLIENT_ID,
      },
      body: JSON.stringify(schedulerData),
    });

    if (!response.ok) {
      console.error('배송중 상태 스케줄러 등록 실패:', response);
      return false;
    }

    console.log(`배송중 상태 변경이 ${schedulerTime}에 예약되었습니다.`);
    return true;
  } catch (error) {
    console.error('배송중 상태 스케줄러 등록 중 오류:', error);
    return false;
  }
}

/**
 * 배송 완료 상태 변경 스케줄러 등록
 * @param {number} orderId - 주문 ID
 * @returns {Promise<boolean>} 스케줄러 등록 성공 여부
 */
export async function registerDeliveryCompleteScheduler(orderId: number): Promise<boolean> {
  try {
    const orderTime = new Date();
    const shippingTime = calculateShippingTime(orderTime);
    const completeTime = calculateDeliveryCompleteTime(shippingTime);
    const schedulerTime = formatSchedulerTime(completeTime);

    // 외부 스케줄러에 배송 완료 상태 변경 등록
    const schedulerData = {
      name: `배송 완료 상태 변경 - 주문 #${orderId}`,
      description: `주문 #${orderId}를 배송 완료 상태(OS040)로 변경`,
      endpoint: `${APP_BASE_URL}/api/orders/${orderId}?action=delivered&status=OS040`,
      time: schedulerTime,
    };

    const response = await fetch(`${API_URL}/scheduler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-id': CLIENT_ID,
      },
      body: JSON.stringify(schedulerData),
    });

    if (!response.ok) {
      console.error('배송 완료 상태 스케줄러 등록 실패:', response);
      return false;
    }

    console.log(`배송 완료 상태 변경이 ${schedulerTime}에 예약되었습니다.`);
    return true;
  } catch (error) {
    console.error('배송 완료 상태 스케줄러 등록 중 오류:', error);
    return false;
  }
}

/**
 * 주문 상태를 업데이트하는 서버 액션 (스케줄러가 호출)
 * @param {number} orderId - 주문 ID
 * @param {string} status - 변경할 상태 (OS035, OS040)
 * @param {string} action - 액션 타입 (shipping, delivered)
 * @returns {Promise<{success: boolean, message: string}>} 업데이트 결과
 */
export async function updateOrderStatusAction(orderId: number, status: string, action: string): Promise<{ success: boolean; message: string }> {
  try {
    // 스케줄러용 판매자 토큰 획득
    const sellerToken = await getSellerToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'client-id': CLIENT_ID,
    };

    // 판매자 토큰 추가
    if (sellerToken) {
      headers['Authorization'] = `Bearer ${sellerToken}`;
      console.log('판매자 토큰을 사용하여 주문 상태 업데이트 요청');
    } else {
      console.error('판매자 토큰 획득 실패 - 인증 없이 요청 시도');
    }

    // 주문 상태 업데이트 (스케줄러에서 자동 실행)
    console.log('📤 API 요청 보내는 중:', {
      url: `${API_URL}/seller/orders/${orderId}`,
      headers,
      body: { state: status },
    });

    const response = await fetch(`${API_URL}/seller/orders/${orderId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        state: status,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `주문 상태 업데이트 실패: ${response.status} ${response.statusText} - ${errorText}`,
      };
    }

    return {
      success: true,
      message: `주문 상태가 ${status}로 변경되었습니다.`,
    };
  } catch (error) {
    console.error('주문 상태 업데이트 중 오류:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      orderId,
      status,
      action,
    });
    return {
      success: false,
      message: `서버 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    };
  }
}
