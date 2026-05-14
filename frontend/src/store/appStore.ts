'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppView =
  | 'dashboard'
  | 'upload'
  | 'realized-trades'
  | 'open-holdings'
  | 'analytics'
  | 'tax-summary'
  | 'exchange-settings'
  | 'notes'
  | 'export'
  | 'export-history'
  | 'documentation'
  | 'settings'
  | 'workspaces';

interface AppState {
  currentView: AppView;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  showCreateWorkspace: boolean;
  pendingManualTrade: boolean;
  setCurrentView: (view: AppView) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  onCreateWorkspace: () => void;
  setShowCreateWorkspace: (show: boolean) => void;
  setPendingManualTrade: (pending: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentView: 'dashboard' as AppView,
      sidebarOpen: false,
      sidebarCollapsed: false,
      showCreateWorkspace: false,
      pendingManualTrade: false,
      setCurrentView: (currentView) => set({ currentView }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      onCreateWorkspace: () => set({ showCreateWorkspace: true }),
      setShowCreateWorkspace: (showCreateWorkspace) => set({ showCreateWorkspace }),
      setPendingManualTrade: (pendingManualTrade) => set({ pendingManualTrade }),
    }),
    {
      name: 'cam-app-storage',
      partialState: (state) => ({ currentView: state.currentView }),
    }
  )
);
