import { useAuth } from '@/store/authStore';
import { useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * 사용자 활동 추적 훅
 * 자동 로그인이 체크되지 않은 상태에서 4시간 비활성 시 자동 로그아웃
 */
export function useActivityTracker() {
  const { zustandUser, zustandLogout, updateActivity } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // 활동 감지 이벤트들 (메모화)
  const activityEvents = useMemo(() => ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'], []);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Zustand 상태 업데이트 (자동 로그인이 아닌 경우만)
    if (zustandUser && !zustandUser.rememberLogin) {
      updateActivity?.();
    }

    // 기존 타이머 클리어
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // 새로운 4시간 타이머 설정 (자동 로그인이 아닌 경우만)
    if (zustandUser && !zustandUser.rememberLogin) {
      timeoutRef.current = setTimeout(
        () => {
          console.log('[Activity Tracker] 4시간 비활성으로 자동 로그아웃');
          zustandLogout();
        },
        4 * 60 * 60 * 1000,
      ); // 4시간
    }
  }, [zustandUser, updateActivity, zustandLogout]);

  useEffect(() => {
    // 일반 로그인 사용자만 활동 추적
    if (!zustandUser || zustandUser.rememberLogin) {
      // 자동 로그인 사용자이거나 로그아웃 상태면 타이머 정리
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // 이벤트 리스너 등록
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // 초기 타이머 설정 (이벤트 없이 직접 타이머만 설정)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = setTimeout(
      () => {
        console.log('[Activity Tracker] 4시간 비활성으로 자동 로그아웃');
        zustandLogout();
      },
      4 * 60 * 60 * 1000,
    ); // 4시간

    // 컴포넌트 언마운트 시 정리
    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [zustandUser, handleActivity, activityEvents, zustandLogout]);

  // 페이지 가시성 변경 처리 (탭 전환 감지)
  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden && zustandUser && !zustandUser.rememberLogin) {
      // 탭이 다시 활성화될 때 세션 검증 (4시간 체크)
      const now = Date.now();
      const lastActivity = lastActivityRef.current;
      const sessionStart = zustandUser.sessionStartTime || now;
      const fourHours = 4 * 60 * 60 * 1000;

      // 세션 시작 또는 마지막 활동 후 4시간 경과 체크
      const sessionExpired = now - sessionStart > fourHours;
      const activityExpired = now - lastActivity > fourHours;

      if (sessionExpired || activityExpired) {
        console.log('[Activity Tracker] 탭 복귀 시 세션 만료 확인 - 자동 로그아웃');
        zustandLogout();
      } else {
        // 활동 재개
        handleActivity();
      }
    }
  }, [zustandUser, zustandLogout, handleActivity]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return {
    lastActivity: lastActivityRef.current,
  };
}
