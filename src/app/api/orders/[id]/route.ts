import { updateOrderStatusAction } from '@/lib/actions/order/orderSchedulerActions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; status: string; action: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')!;
    const action = searchParams.get('action')!;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ success: false, message: '유효하지 않은 주문 ID입니다.' }, { status: 400 });
    }

    const result = await updateOrderStatusAction(orderId, status, action);

    console.log(result);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('API 요청 처리 중 오류:', error);
    return NextResponse.json(
      {
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 },
    );
  }
}
