'use server';

import { ReviewPopCard } from '@/types/reviewPop.types';

const API_URL = process.env.API_URL;
const CLIENT_ID = process.env.CLIENT_ID || '';

// 홈 화면 인기 리뷰 데이터 조회
export async function getReviewPopPosts(): Promise<ReviewPopCard[]> {
  try {
    const res = await fetch(`${API_URL}/replies/all?full_name=true`, {
      headers: {
        'client-id': CLIENT_ID,
      },
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      console.error('[getReviewPopPosts] 리뷰 전체 조회 실패', res.status);
      return [];
    }

    const allReplies = data.item;

    // product_id가 누락된 경우, product._id로 보완
    allReplies.forEach((reply: ReviewPopCard) => {
      if (!reply.product_id && reply.product?._id) {
        reply.product_id = reply.product._id;
      }
    });

    // product_id 기준으로 리뷰 묶기
    const reviewMap = new Map<number, ReviewPopCard[]>();

    allReplies.forEach((reply: ReviewPopCard) => {
      const id = reply.product_id;
      if (typeof id !== 'number') return;

      const group = reviewMap.get(id) || [];
      group.push(reply);
      reviewMap.set(id, group);
    });

    // 리뷰 수 많은 상품 4개 추출
    const top4 = Array.from(reviewMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 4);

    // 각 상품에서 질 좋은 리뷰 1개씩 추출 (내용 20자 이상, 평점순)
    const result = top4.map(([, replies]) => {
      const filtered = replies.filter((result) => result.content.trim().length >= 20);
      // 조건 만족하는 리뷰 있으면 평점 높은 순으로 정렬해서 뽑기
      const best = filtered.length > 0 ? filtered.sort((a, b) => b.rating - a.rating)[0] : replies.sort((a, b) => b.rating - a.rating)[0];

      const totalRating = replies.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = replies.length > 0 ? totalRating / replies.length : 0;

      return {
        content: best.content,
        rating: best.rating,
        createdAt: best.createdAt,
        product_id: best.product_id,
        user: {
          name: best.user.name,
          image: best.user.image,
        },
        product: best.product,
        averageRating,
      };
    });

    return result;
  } catch (err) {
    console.error('홈의 인기 리뷰글을 불러오는 데 실패했습니다.', err);
    return [];
  }
}
