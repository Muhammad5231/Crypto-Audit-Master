import {
  LayoutDashboard, ArrowRightLeft, Wallet, BarChart3, FileText,
  Settings as SettingsIcon, HelpCircle, FileDown, FileCheck, StickyNote, Palette,
  LayoutGrid
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  view: string;
  accentColor?: string;
  isMainTab?: boolean; // for mobile bottom nav (max 5)
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard', accentColor: 'bg-teal-500', isMainTab: true },
  { key: 'realized-trades', label: 'Realized Trades', icon: ArrowRightLeft, view: 'realized-trades', accentColor: 'bg-emerald-500', isMainTab: true },
  { key: 'open-holdings', label: 'Open Holdings', icon: Wallet, view: 'open-holdings', accentColor: 'bg-emerald-500', isMainTab: true },
  { key: 'workspaces', label: 'Workspaces', icon: LayoutGrid, view: 'workspaces', accentColor: 'bg-teal-500', isMainTab: true },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, view: 'analytics', accentColor: 'bg-orange-500', isMainTab: true },
  { key: 'tax-summary', label: 'Tax Summary', icon: FileCheck, view: 'tax-summary', accentColor: 'bg-orange-500' },
  { key: 'exchange-settings', label: 'Exchange Settings', icon: SettingsIcon, view: 'exchange-settings', accentColor: 'bg-cyan-500' },
  { key: 'notes', label: 'Notes', icon: StickyNote, view: 'notes', accentColor: 'bg-cyan-500' },
  { key: 'export', label: 'Export', icon: FileDown, view: 'export', accentColor: 'bg-orange-500' },
  { key: 'export-history', label: 'Export History', icon: FileText, view: 'export-history', accentColor: 'bg-orange-500' },
  // Upload, Documentation, Settings removed from sidebar but views still accessible via Dashboard buttons & Command Palette
];

// Hidden nav items (accessible via command palette / direct links, not shown in sidebar)
export const HIDDEN_NAV_ITEMS: NavItem[] = [
  { key: 'upload', label: 'Upload Center', icon: SettingsIcon, view: 'upload', accentColor: 'bg-teal-500' },
  { key: 'documentation', label: 'Documentation', icon: HelpCircle, view: 'documentation', accentColor: 'bg-muted-foreground' },
  { key: 'settings', label: 'Settings', icon: Palette, view: 'settings', accentColor: 'bg-muted-foreground' },
];

export const MAIN_TABS = NAV_ITEMS.filter(item => item.isMainTab);
export const MORE_ITEMS = NAV_ITEMS.filter(item => !item.isMainTab);

// Lookup maps for Topbar accent indicator and labels
// Include hidden items so topbar accent still works when navigating via buttons
const ALL_NAV = [...NAV_ITEMS, ...HIDDEN_NAV_ITEMS];
export const VIEW_LABELS: Record<string, string> = Object.fromEntries(
  ALL_NAV.map(item => [item.view, item.label])
);
export const VIEW_ACCENT_COLORS: Record<string, string> = Object.fromEntries(
  ALL_NAV.map(item => [item.view, item.accentColor || 'bg-muted-foreground'])
);
