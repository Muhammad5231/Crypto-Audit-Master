import { create } from 'zustand';

interface TradeSelectionState {
  selectedIds: Set<string>;
  toggleTrade: (id: string) => void;
  selectTrade: (id: string) => void;
  deselectTrade: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  getSelectedCount: () => number;
  getSelectedArray: () => string[];
}

export const useTradeSelectionStore = create<TradeSelectionState>()((set, get) => ({
  selectedIds: new Set<string>(),

  toggleTrade: (id: string) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedIds: newSet };
    }),

  selectTrade: (id: string) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      newSet.add(id);
      return { selectedIds: newSet };
    }),

  deselectTrade: (id: string) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      newSet.delete(id);
      return { selectedIds: newSet };
    }),

  selectAll: (ids: string[]) =>
    set(() => ({ selectedIds: new Set(ids) })),

  clearSelection: () =>
    set(() => ({ selectedIds: new Set() })),

  isSelected: (id: string) => get().selectedIds.has(id),

  getSelectedCount: () => get().selectedIds.size,

  getSelectedArray: () => Array.from(get().selectedIds),
}));
