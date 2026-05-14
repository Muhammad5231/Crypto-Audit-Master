import { create } from "zustand";

interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  financialYear: string;
  isArchived: boolean;
  lastOpenedAt: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    csvFiles: number;
    trades: number;
    reports: number;
    notes: number;
    exchangeSettings: number;
  };
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, data: Partial<Workspace>) => void;
  removeWorkspace: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  workspaces: [],
  activeWorkspace: null,
  isLoading: false,
  setWorkspaces: (workspaces) =>
    set({ workspaces: Array.isArray(workspaces) ? workspaces : [], isLoading: false }),
  setActiveWorkspace: (workspace) =>
    set({ activeWorkspace: workspace }),
  addWorkspace: (workspace) =>
    set((state) => ({ workspaces: [workspace, ...(state.workspaces || [])] })),
  updateWorkspace: (id, data) =>
    set((state) => ({
      workspaces: (state.workspaces || []).map((ws) =>
        ws.id === id ? { ...ws, ...data } : ws
      ),
      activeWorkspace:
        state.activeWorkspace?.id === id
          ? { ...state.activeWorkspace, ...data }
          : state.activeWorkspace,
    })),
  removeWorkspace: (id) =>
    set((state) => ({
      workspaces: (state.workspaces || []).filter((ws) => ws.id !== id),
      activeWorkspace:
        state.activeWorkspace?.id === id ? null : state.activeWorkspace,
    })),
  setLoading: (isLoading) => set({ isLoading }),
}));
