/**
 * Term Change Detection and Auto-Refresh System
 * Graceland Royal Academy School Management System
 */

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { API_CONFIG, getAuthToken } from '../config/api';

interface TermChangeDetectorProps {
  currentTerm: string;
  currentAcademicYear: string;
  onTermChange: (newTerm: string, newYear: string) => void;
  refreshAllData: () => Promise<void>;
}

export function useTermChangeDetector({
  currentTerm,
  currentAcademicYear,
  onTermChange,
  refreshAllData
}: TermChangeDetectorProps) {
  const previousTermRef = useRef<string>(currentTerm);
  const previousYearRef = useRef<string>(currentAcademicYear);
  const isRefreshingRef = useRef<boolean>(false);

  useEffect(() => {
    // Check if term or academic year has changed
    const termChanged = previousTermRef.current !== currentTerm;
    const yearChanged = previousYearRef.current !== currentAcademicYear;

    if ((termChanged || yearChanged) && !isRefreshingRef.current) {
      //console.log('🔄 Term/Year change detected:', {
        previous: { term: previousTermRef.current, year: previousYearRef.current },
        current: { term: currentTerm, year: currentAcademicYear },
        changes: { termChanged, yearChanged }
      });

      // Prevent multiple refreshes
      isRefreshingRef.current = true;

      // Notify about the change
      const changeMessage = termChanged 
        ? `Term changed to ${currentTerm}` 
        : `Academic year changed to ${currentAcademicYear}`;
      
      toast.info(changeMessage, {
        description: 'Refreshing all data...',
        duration: 3000
      });

      // Trigger refresh
      const refreshData = async () => {
        try {
          await refreshAllData();
          toast.success('Data refreshed successfully', {
            description: `Now showing ${currentTerm} ${currentAcademicYear}`,
            duration: 2000
          });
          
          // Notify parent component
          onTermChange(currentTerm, currentAcademicYear);
        } catch (error) {
          //console.error('Error refreshing data after term change:', error);
          toast.error('Failed to refresh data', {
            description: 'Please refresh the page manually'
          });
        } finally {
          // Reset refresh flag after a delay
          setTimeout(() => {
            isRefreshingRef.current = false;
          }, 1000);
        }
      };

      refreshData();
    }

    // Update refs
    previousTermRef.current = currentTerm;
    previousYearRef.current = currentAcademicYear;
  }, [currentTerm, currentAcademicYear, onTermChange, refreshAllData]);

  return {
    isRefreshing: isRefreshingRef.current
  };
}

/**
 * Hook to periodically check for term changes from server
 */
export function useTermSync({
  currentTerm,
  currentAcademicYear,
  refreshAllData
}: {
  currentTerm: string;
  currentAcademicYear: string;
  refreshAllData: () => Promise<void>;
}) {
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check for term changes every 30 seconds - DISABLED to prevent timeout errors
    const checkTermSync = async () => {
      try {
        // DISABLED: School settings API is timing out
        //console.log('Term sync check disabled to prevent API timeout errors');
        return;
        
        // Original code (disabled):
        /*
        const token = await getAuthToken();
        const response = await fetch(`${API_CONFIG.BASE_URL}/school_settings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.success && data.data) {
          const serverTerm = data.data.find((s: any) => s.setting_key === 'current_term')?.setting_value;
          const serverYear = data.data.find((s: any) => s.setting_key === 'current_academic_year')?.setting_value;
          
          if (serverTerm && serverYear && (serverTerm !== currentTerm || serverYear !== currentAcademicYear)) {
            //console.log('🔄 Server term/year mismatch detected:', {
              local: { term: currentTerm, year: currentAcademicYear },
              server: { term: serverTerm, year: serverYear }
            });
            
            toast.info('Term/Year updated on server', {
              description: 'Refreshing data...',
              duration: 3000
            });
            
            await refreshAllData();
          }
        }
        */
      } catch (error) {
        // Silently fail - don't show errors for periodic sync
              }
    };

    // DISABLED: Periodic sync to prevent API timeout errors
        // syncIntervalRef.current = setInterval(checkTermSync, 30000); // 30 seconds

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [currentTerm, currentAcademicYear, refreshAllData]);
}
