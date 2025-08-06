import { StaticImageData } from 'next/image';
import { Diary } from '../_types/diary.types';

/**
 * 일지 데이터 검증 함수
 */
export const validateDiary = (diary: Partial<Diary>): boolean => {
  return !!(diary.title && diary.title.trim() && diary.content && diary.content.trim());
};

/**
 * 일지 정렬 함수 (최신순)
 */
export const sortDiariesByDate = (diaries: Diary[]): Diary[] => {
  return [...diaries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * 일지 필터링 함수 (특정 식물 ID)
 */
export const filterDiariesByPlantId = (diaries: Diary[], plantId: number): Diary[] => {
  return diaries.filter((diary) => diary.plantId === plantId);
};

/**
 * 페이지네이션 계산 함수
 */
export const calculatePagination = (totalItems: number, itemsPerPage: number, currentPage: number) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;

  return {
    totalPages,
    startIdx,
    endIdx,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
};

/**
 * 일지 생성 시 기본값 설정
 */
export const createDiaryDefaults = (plantId: number, title: string, content: string, images: (string | StaticImageData)[]) => {
  return {
    id: Date.now(), // 임시 ID 생성
    plantId,
    title,
    content,
    images,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };
};

/**
 * 일지 제목 축약 함수
 */
export const truncateTitle = (title: string, maxLength: number = 30): string => {
  return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
};

/**
 * 일지 내용 축약 함수
 */
export const truncateContent = (content: string, maxLength: number = 100): string => {
  return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
};

/**
 * 날짜 포맷팅 함수
 */
export const formatDate = (dateString: string): string => {
  const fixed = dateString.replace(/\./g, '-').replace(' ', 'T');
  const date = new Date(fixed);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * 상대적 시간 표시 함수
 */
export const getRelativeTime = (dateString: string): string => {
  const safeString = dateString.replace(/\./g, '-').replace(' ', 'T');
  const date = new Date(safeString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
};
