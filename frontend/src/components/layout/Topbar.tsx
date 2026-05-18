'use client';

import {
  ChevronDown,
  LogOut,
  Moon,
  Plus,
  Search,
  Sun,
  UploadCloud,
  UserCog,
} from 'lucide-react';
import { VIEW_ACCENT_COLORS, VIEW_LABELS } from '@/lib/constants/navItems';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useKeyboardShortcutsStore } from '@/store/keyboardShortcutsStore';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { useCommandPaletteStore } from '@/store/commandPaletteStore';
import { cn } from '@/lib/utils';

function KeyboardShortcutsTrigger() {
  const open = useKeyboardShortcutsStore((s) => s.open);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-xl"
      onClick={open}
      aria-label="Keyboard shortcuts"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4.5 w-4.5"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.001" />
        <path d="M10 8h.001" />
        <path d="M14 8h.001" />
        <path d="M18 8h.001" />
        <path d="M8 12h.001" />
        <path d="M12 12h.001" />
        <path d="M16 12h.001" />
        <path d="M7 16h10" />
      </svg>
      <span className="sr-only">Keyboard shortcuts</span>
    </Button>
  );
}

export function Topbar() {
  const { setTheme, resolvedTheme } = useTheme();

  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setPendingManualTrade = useAppStore((s) => s.setPendingManualTrade);

  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  function handleLogout() {
    clearAuth();
  }

  function handleUploadCsv() {
    setCurrentView('upload');
  }

  function handleAddTrade() {
    setPendingManualTrade(true);
    setCurrentView('upload');
  }

  function handleThemeToggle() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  return (
    <header className="z-30 shrink-0 border-b border-border/50 bg-card/70 px-3 backdrop-blur-xl lg:px-6">
      <div className="flex min-h-[56px] items-center gap-3 lg:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={cn(
                'h-5 w-[3px] shrink-0 rounded-full transition-colors duration-300',
                VIEW_ACCENT_COLORS[currentView]
              )}
            />
            <h2 className="truncate text-sm font-semibold text-foreground">
              {VIEW_LABELS[currentView]}
            </h2>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <WorkspaceSelector />
          <ProfileMenu
            isMobile
            onLogout={handleLogout}
            onOpenSettings={() => setCurrentView('settings')}
            onToggleTheme={handleThemeToggle}
            resolvedTheme={resolvedTheme}
            username={user?.username}
            email={user?.email}
          />
        </div>
      </div>

      <div className="hidden h-14 items-center lg:flex">
        <div className="mr-3">
          <WorkspaceSelector />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div
            className={cn(
              'h-5 w-[3px] rounded-full transition-colors duration-300',
              VIEW_ACCENT_COLORS[currentView]
            )}
          />
          <h2 className="truncate text-sm font-semibold text-foreground">
            {VIEW_LABELS[currentView]}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="hidden h-9 gap-2 rounded-xl px-3 text-muted-foreground hover:text-foreground xl:flex"
            onClick={() => useCommandPaletteStore.getState().open()}
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">Search</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground 2xl:inline-flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="hidden h-9 gap-2 rounded-xl border-teal-500/35 px-3 text-xs text-teal-600 hover:bg-teal-600/10 dark:text-teal-400 md:flex"
            onClick={handleUploadCsv}
          >
            <UploadCloud className="h-4 w-4" />
            Upload CSV
          </Button>

          <Button
            size="sm"
            className="hidden h-9 gap-2 rounded-xl bg-teal-600 px-3 text-xs text-white hover:bg-teal-700 md:flex"
            onClick={handleAddTrade}
          >
            <Plus className="h-4 w-4" />
            Add Trade
          </Button>

          <KeyboardShortcutsTrigger />

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={handleThemeToggle}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4.5 w-4.5" />
            ) : (
              <Moon className="h-4.5 w-4.5" />
            )}
          </Button>

          <ProfileMenu
            isMobile={false}
            onLogout={handleLogout}
            onOpenSettings={() => setCurrentView('settings')}
            onToggleTheme={handleThemeToggle}
            resolvedTheme={resolvedTheme}
            username={user?.username}
            email={user?.email}
          />
        </div>
      </div>
    </header>
  );
}

function ProfileMenu({
  isMobile,
  onLogout,
  onOpenSettings,
  onToggleTheme,
  resolvedTheme,
  username,
  email,
}: {
  isMobile: boolean;
  onLogout: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  resolvedTheme?: string;
  username?: string;
  email?: string;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center rounded-xl text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none',
            isMobile ? 'h-9 w-9 justify-center px-0' : 'h-9 gap-2 px-2'
          )}
          aria-label="Open profile menu"
          title="Profile menu"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-teal-600/10 text-[11px] font-semibold text-teal-600 dark:text-teal-400">
              {username?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {!isMobile ? (
            <>
              <span className="max-w-[120px] truncate">{username || 'User'}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="z-[9999] w-56 rounded-xl border bg-popover p-1 shadow-xl"
      >
        <div className="px-2 py-2">
          <p className="text-sm font-semibold">{username || 'User'}</p>
          <p className="truncate text-xs text-muted-foreground">{email || 'No email'}</p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={onOpenSettings} className="cursor-pointer rounded-lg">
          <UserCog className="mr-2 h-4 w-4" />
          Account Settings
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onToggleTheme} className="cursor-pointer rounded-lg">
          {resolvedTheme === 'dark' ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={onLogout}
          className="cursor-pointer rounded-lg text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
