import {
  ArrowRightLeft,
  BarChart3,
  FileCheck,
  FileDown,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  Palette,
  Settings as SettingsIcon,
  StickyNote,
  Upload,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppView } from '@/store/appStore';

export interface NavItem {
  key: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  view: AppView;
  accentColor?: string;
  inSidebar?: boolean;
  isMobilePrimary?: boolean;
  isMobileMore?: boolean;
  isMobileQuickAction?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Dashboard',
    icon: LayoutDashboard,
    view: 'dashboard',
    accentColor: 'bg-teal-500',
    inSidebar: true,
    isMobilePrimary: true,
  },
  {
    key: 'realized-trades',
    label: 'Realized Trades',
    shortLabel: 'Trades',
    icon: ArrowRightLeft,
    view: 'realized-trades',
    accentColor: 'bg-emerald-500',
    inSidebar: true,
    isMobilePrimary: true,
  },
  {
    key: 'open-holdings',
    label: 'Open Holdings',
    shortLabel: 'Holdings',
    icon: Wallet,
    view: 'open-holdings',
    accentColor: 'bg-cyan-500',
    inSidebar: true,
    isMobilePrimary: true,
  },
  {
    key: 'workspaces',
    label: 'Workspaces',
    icon: LayoutGrid,
    view: 'workspaces',
    accentColor: 'bg-teal-500',
    inSidebar: true,
    isMobileMore: true,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    view: 'analytics',
    accentColor: 'bg-orange-500',
    inSidebar: true,
    isMobileMore: true,
  },
  {
    key: 'tax-summary',
    label: 'Tax Summary',
    icon: FileCheck,
    view: 'tax-summary',
    accentColor: 'bg-orange-500',
    inSidebar: true,
    isMobileMore: true,
  },
  {
    key: 'exchange-settings',
    label: 'Exchange Settings',
    icon: SettingsIcon,
    view: 'exchange-settings',
    accentColor: 'bg-cyan-500',
    inSidebar: true,
    isMobileMore: true,
  },
  {
    key: 'notes',
    label: 'Notes',
    icon: StickyNote,
    view: 'notes',
    accentColor: 'bg-cyan-500',
    inSidebar: true,
    isMobileMore: true,
  },
  {
    key: 'export',
    label: 'Export',
    icon: FileDown,
    view: 'export',
    accentColor: 'bg-orange-500',
    inSidebar: true,
    isMobileMore: true,
    isMobileQuickAction: true,
  },
  {
    key: 'export-history',
    label: 'Export History',
    icon: FileText,
    view: 'export-history',
    accentColor: 'bg-orange-500',
    inSidebar: true,
    isMobileMore: true,
  },
];

export const HIDDEN_NAV_ITEMS: NavItem[] = [
  {
    key: 'upload',
    label: 'Upload Center',
    shortLabel: 'Upload',
    icon: Upload,
    view: 'upload',
    accentColor: 'bg-teal-500',
    inSidebar: false,
    isMobileQuickAction: true,
  },
  {
    key: 'documentation',
    label: 'Documentation',
    icon: HelpCircle,
    view: 'documentation',
    accentColor: 'bg-muted-foreground',
    inSidebar: false,
    isMobileMore: true,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: Palette,
    view: 'settings',
    accentColor: 'bg-muted-foreground',
    inSidebar: false,
    isMobileMore: true,
  },
];

export const ALL_NAV_ITEMS = [...NAV_ITEMS, ...HIDDEN_NAV_ITEMS];

export const SIDEBAR_ITEMS = ALL_NAV_ITEMS.filter((item) => item.inSidebar !== false);
export const MOBILE_PRIMARY_TABS = ALL_NAV_ITEMS.filter((item) => item.isMobilePrimary);
export const MOBILE_MORE_ITEMS = ALL_NAV_ITEMS.filter((item) => item.isMobileMore);
export const MOBILE_MORE_QUICK_ACTIONS = ALL_NAV_ITEMS.filter((item) => item.isMobileQuickAction);

export const NAV_ITEM_BY_VIEW = Object.fromEntries(
  ALL_NAV_ITEMS.map((item) => [item.view, item])
) as Record<AppView, NavItem>;

export const VIEW_LABELS: Record<AppView, string> = Object.fromEntries(
  ALL_NAV_ITEMS.map((item) => [item.view, item.label])
) as Record<AppView, string>;

export const VIEW_ACCENT_COLORS: Record<AppView, string> = Object.fromEntries(
  ALL_NAV_ITEMS.map((item) => [item.view, item.accentColor || 'bg-muted-foreground'])
) as Record<AppView, string>;
