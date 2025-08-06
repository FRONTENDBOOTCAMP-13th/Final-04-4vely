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
 * 한국 시간으로 변환하여 스케줄러 API 형식으로 포맷 (YYYY.MM.DD HH:mm:ss)
 * @param {Date} date - 변환할 날짜 (UTC 기준)
 * @returns {string} 한국 시간으로 형식화된 시간 문자열
 */
function formatKoreanSchedulerTime(date: Date): string {
  // UTC 시간에 9시간을 더해서 한국 시간으로 변환
  const koreaTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);

  // 한국 시간을 "YYYY.MM.DD HH:mm:ss" 형식으로 생성
  const year = koreaTime.getUTCFullYear();
  const month = String(koreaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(koreaTime.getUTCDate()).padStart(2, '0');
  const hours = String(koreaTime.getUTCHours()).padStart(2, '0');
  const minutes = String(koreaTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(koreaTime.getUTCSeconds()).padStart(2, '0');

  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 배송중 상태 변경 스케줄러 등록
 * @param {number} orderId - 주문 ID
 * @returns {Promise<boolean>} 스케줄러 등록 성공 여부
 */
export async function registerShippingStatusScheduler(orderId: number): Promise<boolean> {
  try {
    // 현재 시간에서 1일 후 한국 시간으로 생성
    const now = new Date();
    now.setDate(now.getDate() + 1); // 1일 후
    const schedulerTime = formatKoreanSchedulerTime(now);

    console.log('현재 UTC 시간:', new Date().toISOString());
    console.log('생성된 한국 시간 (배송중):', schedulerTime);

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
    // 현재 시간에서 2일 후 한국 시간으로 생성
    const now = new Date();
    now.setDate(now.getDate() + 2); // 2일 후
    const schedulerTime = formatKoreanSchedulerTime(now);

    console.log('현재 UTC 시간:', new Date().toISOString());
    console.log('생성된 한국 시간 (배송완료):', schedulerTime);

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
