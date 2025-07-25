// Header에서 사용하는 Tailwind CSS 클래스 정의
export const HEADER_CONTAINER = 'relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 md:px-8 md:py-6';
export const NAV_LINK = 't-small text-secondary';
export const MOBILE_MENU_LINK = 't-body rounded-lg px-4 py-2 text-center text-secondary transition-colors duration-150 hover:bg-green-50 w-full';

// 메뉴 항목 배열
export const menuLinks = [
  { name: '큐레이션', href: '/curation', showOn: ['desktop', 'mobile'] },
  { name: '쇼핑하기', href: '/shop', showOn: ['desktop', 'mobile'] },
  { name: '커뮤니티', href: '/community', showOn: ['desktop', 'mobile'] },
  { name: 'FAQ', href: '/faq', showOn: ['desktop', 'mobile'] },
  { name: '마이페이지', href: '/my-page', showOn: ['mobile'] },
  { name: '장바구니', href: '/cart', showOn: ['mobile'] },
  { name: '로그인', href: '/login', showOn: ['mobile'] },
];

// headerIcons 배열
export const headerIcons = [
  {
    name: 'Login',
    href: '/login',
    text: 'Login',
  },
  {
    name: '마이페이지',
    href: '/my-page',
    icon: 'UserRound',
  },
  {
    name: '장바구니',
    href: '/cart',
    icon: 'ShoppingCart',
  },
];
