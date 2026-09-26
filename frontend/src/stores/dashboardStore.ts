import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dashboardService, type DashboardData } from '../lib/dashboardService';

const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastFetched: number | null;
  error: string | null;

  // Actions
  fetchDashboardData: (options?: { force?: boolean }) => Promise<DashboardData | null>;
  prefetch: () => Promise<void>;
  invalidate: () => void;
  setData: (data: DashboardData) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      data: null,
      isLoading: false,
      isRefreshing: false,
      lastFetched: null,
      error: null,

      fetchDashboardData: async (options = {}) => {
        const { force = false } = options;
        const current = get();

        // If we have cached data and it's not expired and force is not set, return cache immediately
        const isFresh =
          current.data !== null &&
          current.lastFetched !== null &&
          Date.now() - current.lastFetched < CACHE_TTL_MS;

        if (isFresh && !force) {
          return current.data;
        }

        // If we already have data (stale or force refresh), revalidate in background without blocking UI
        if (current.data !== null) {
          set({ isRefreshing: true, error: null });
        } else {
          set({ isLoading: true, error: null });
        }

        try {
          const freshData = await dashboardService.getDashboardData();
          set({
            data: freshData,
            isLoading: false,
            isRefreshing: false,
            lastFetched: Date.now(),
            error: null,
          });
          return freshData;
        } catch (err: any) {
          set({
            isLoading: false,
            isRefreshing: false,
            error: err?.message || 'Failed to fetch dashboard metrics',
          });
          return current.data;
        }
      },

      prefetch: async () => {
        const current = get();
        const isFresh =
          current.data !== null &&
          current.lastFetched !== null &&
          Date.now() - current.lastFetched < CACHE_TTL_MS;

        if (!isFresh) {
          // Quiet background prefetch without blocking any screen
          try {
            set({ isRefreshing: current.data !== null });
            const freshData = await dashboardService.getDashboardData();
            set({
              data: freshData,
              isLoading: false,
              isRefreshing: false,
              lastFetched: Date.now(),
              error: null,
            });
          } catch {
            set({ isRefreshing: false });
          }
        }
      },

      invalidate: () => {
        set({ lastFetched: null });
      },

      setData: (data: DashboardData) => {
        set({ data, lastFetched: Date.now(), error: null });
      },
    }),
    {
      name: 'stocksense_dashboard_cache',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        data: state.data,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

// Invalidate cache automatically whenever operations or products change
if (typeof window !== 'undefined') {
  window.addEventListener('stocksense:data-changed', () => {
    useDashboardStore.getState().invalidate();
  });
}

