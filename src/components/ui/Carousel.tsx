'use client';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import * as React from 'react';

type CarouselApi = UseEmblaCarouselType[1];

type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions; // Embla 옵션
  plugins?: CarouselPlugin; // Embla 플러그인
  orientation?: 'horizontal' | 'vertical'; // 방향 설정
  setApi?: (api: CarouselApi) => void;
};

// 캐러셀 컨텍스트 내부에서 제공할 값들
type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]; // DOM ref
  api: ReturnType<typeof useEmblaCarousel>[1]; // Embla API
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

// ----------------------
// 캐러셀 컨텍스트 생성
// ----------------------
const CarouselContext = React.createContext<CarouselContextProps | null>(null);

// 커스텀 훅: context가 없으면 에러 발생
function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) throw new Error('useCarousel must be used within a <Carousel />');
  return context;
}

// ----------------------
// Carousel (메인 컴포넌트)
// ----------------------
function Carousel({ orientation = 'horizontal', opts, setApi, plugins, className, children, ...props }: React.ComponentProps<'div'> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      loop: true, // 슬라이드 무한 루프 설정
      ...opts,
      axis: orientation === 'horizontal' ? 'x' : 'y',
    },
    plugins,
  );

  // 좌/우 이동 가능 여부 상태
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  // 선택 시 상태 업데이트 함수
  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  // 좌/우 이동 함수
  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);

  // 키보드 방향키로도 이동 가능하게 설정
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext],
  );

  // API 외부로 전달
  React.useEffect(() => {
    if (api && setApi) setApi(api);
  }, [api, setApi]);

  // 캐러셀 상태 이벤트 등록
  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on('reInit', onSelect);
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        opts,
        orientation: orientation || (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div onKeyDownCapture={handleKeyDown} className={cn('relative', className)} role='region' aria-roledescription='carousel' data-slot='carousel' {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

// ----------------------
// CarouselContent (슬라이드 컨테이너)
// ----------------------
function CarouselContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div ref={carouselRef} className='overflow-hidden' data-slot='carousel-content'>
      <div className={cn('flex', orientation === 'horizontal' ? '' : '-mt-4 flex-col', className)} {...props} />
    </div>
  );
}

// ----------------------
// CarouselItem (개별 슬라이드)
// ----------------------
function CarouselItem({ className, ...props }: React.ComponentProps<'div'>) {
  const { orientation } = useCarousel();

  // 모바일: 100%, 태블릿: 50%, PC: 33.3%
  return <div role='group' aria-roledescription='slide' data-slot='carousel-item' className={cn('min-w-0 shrink-0 grow-0 px-2', orientation === 'horizontal' ? 'w-full sm:w-1/2 lg:w-1/3' : 'pt-4', className)} {...props} />;
}

// ----------------------
// CarouselPrevious (이전 버튼)
// ----------------------
function CarouselPrevious({ className, variant = 'outline', size = 'icon', ...props }: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  return (
    <Button
      data-slot='carousel-previous'
      variant={variant}
      size={size}
      className={cn('absolute size-12 rounded-full', 'invisible md:visible', orientation === 'horizontal' ? 'top-1/2 -left-12 -translate-y-1/2' : '-top-12 left-1/2 -translate-x-1/2 rotate-90', className)}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className='h-6 w-6' />
      <span className='sr-only'>Previous slide</span>
    </Button>
  );
}

// ----------------------
// CarouselNext (다음 버튼)
// ----------------------
function CarouselNext({ className, variant = 'outline', size = 'icon', ...props }: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  return (
    <Button
      data-slot='carousel-next'
      variant={variant}
      size={size}
      className={cn('absolute size-12 rounded-full', orientation === 'horizontal' ? 'top-1/2 -right-12 -translate-y-1/2' : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90', className)}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className='h-6 w-6' />
      <span className='sr-only'>Next slide</span>
    </Button>
  );
}

export { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi };
