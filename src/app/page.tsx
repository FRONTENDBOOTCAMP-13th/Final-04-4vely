export const dynamic = 'force-dynamic';

import CommunityPop from '@/components/_home/CommunityPop';
import GreenMagazineSection from '@/components/_home/green-magazine/GreenMagazineSection';
import HomeHero from '@/components/_home/HomeHero';
import NewProductSection from '@/components/_home/new-product/NewProductSection';
import ReviewCarousel from '@/components/_home/ReviewCarousel';
import WeatherWidget from '@/components/_home/weather/WeatherWidget';
import { getReviewPopPosts } from '@/lib/functions/home/getReviewPopPosts';

export default async function Home() {
  const reviews = await getReviewPopPosts();

  return (
    <div className='text-secondary flex flex-col md:text-2xl lg:text-3xl'>
      {/* Hero 배너 */}
      <HomeHero />

      {/* 날씨 정보 */}
      <WeatherWidget />

      {/* New Product */}
      <NewProductSection />

      {/* Green Magazine (최신순 기준) */}
      <GreenMagazineSection />

      {/* 인기 반려 식물 (커뮤니티 -> 조회수 기준) */}
      <CommunityPop />

      {/* 사용자의 생생한 후기*/}
      <ReviewCarousel reviews={reviews} />
    </div>
  );
}
