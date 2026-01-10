import { useState, useEffect } from 'react';

interface MobileOptimizationState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  screenWidth: number;
  screenHeight: number;
}

export const useMobileOptimization = (): MobileOptimizationState => {
  const [state, setState] = useState<MobileOptimizationState>(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: 'landscape',
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  const updateState = (): void => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    
    setState({
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      orientation: width > height ? 'landscape' : 'portrait',
      screenWidth: width,
      screenHeight: height,
    });
  };

  const handleOrientationChange = (): void => {
    updateState();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      updateState();
      
      window.addEventListener('resize', updateState);
      window.addEventListener('orientationchange', handleOrientationChange);
      
      return () => {
        window.removeEventListener('resize', updateState);
        window.removeEventListener('orientationchange', handleOrientationChange);
      };
    }
  }, []);

  return state;
};
