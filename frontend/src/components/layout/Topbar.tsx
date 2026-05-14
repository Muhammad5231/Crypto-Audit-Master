'use client';

import {
  Sun,
  Moon,
  Menu,
  UserCog,
  LogOut,
  Plus,
  Search,
  UploadCloud,
  ChevronDown,
} from "lucide-react";
import { NAV_ITEMS, VIEW_LABELS, VIEW_ACCENT_COLORS } from "@/lib/constants/navItems";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useKeyboardShortcutsStore } from "@/store/keyboardShortcutsStore";
import { WorkspaceSelector } from "@/components/workspace/WorkspaceSelector";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { cn } from "@/lib/utils";

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
  const onCreateWorkspace = useAppStore((s) => s.onCreateWorkspace);
  const setPendingManualTrade = useAppStore((s) => s.setPendingManualTrade);

  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useWorkspaceStore((s) => s.activeWorkspace);

  function handleLogout() {
    clearAuth();
  }

  function handleUploadCsv() {
    setCurrentView("upload");
  }

  function handleAddTrade() {
    setPendingManualTrade(true);
    setCurrentView("upload");
  }

  return (
    <header className="shrink-0 z-30 flex items-center h-12 lg:h-14 border-b border-border/50 bg-card/60 backdrop-blur-xl px-3 lg:px-6">
      <div className="lg:hidden mr-1.5">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <Menu className="h-4.5 w-4.5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="p-4 pb-2">
              <SheetTitle className="text-left flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-white"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  </svg>
                </div>
                <span className="text-base">Crypto Audit Master</span>
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-80px)]">
              <div className="px-3 pb-6 space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:text-foreground h-9 text-xs mb-2"
                  onClick={onCreateWorkspace}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Workspace
                </Button>

                <Separator className="mb-2" />

                {NAV_ITEMS.map((item) => {
                  const isActive = currentView === item.view;
                  const Icon = item.icon;

                  return (
                    <SheetClose key={item.view} asChild>
                      <button
                        onClick={() => setCurrentView(item.view)}
                        className={cn(
                          "flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                          isActive
                            ? "bg-teal-600/10 text-teal-600 dark:text-teal-400"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        <span>{item.label}</span>

                        {isActive && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-600 dark:bg-teal-400" />
                        )}
                      </button>
                    </SheetClose>
                  );
                })}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mr-3">
        <WorkspaceSelector />
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-2.5">
        <div
          className={cn(
            "h-5 w-[3px] rounded-full transition-colors duration-300",
            VIEW_ACCENT_COLORS[currentView]
          )}
        />
        <h2 className="text-sm font-semibold text-foreground truncate">
          {VIEW_LABELS[currentView]}
        </h2>
      </div>

      <div className="flex items-center gap-1 lg:gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex h-9 gap-2 rounded-xl px-3 text-muted-foreground hover:text-foreground"
          onClick={() => useCommandPaletteStore.getState().open()}
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" />
          <span className="text-xs">Search</span>
          <kbd className="pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {/* Permanent quick actions */}
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex h-9 gap-2 rounded-xl border-teal-500/35 px-3 text-xs text-teal-600 hover:bg-teal-600/10 dark:text-teal-400"
          onClick={handleUploadCsv}
        >
          <UploadCloud className="h-4 w-4" />
          Upload CSV
        </Button>

        <Button
          size="sm"
          className="hidden md:flex h-9 gap-2 rounded-xl bg-teal-600 px-3 text-xs text-white hover:bg-teal-700"
          onClick={handleAddTrade}
        >
          <Plus className="h-4 w-4" />
          Add Trade
        </Button>

        <div className="hidden lg:block">
          <KeyboardShortcutsTrigger />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4.5 w-4.5" />
          ) : (
            <Moon className="h-4.5 w-4.5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User dropdown */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-xl px-2 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
              aria-label="Open profile menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-teal-600/10 text-teal-600 dark:text-teal-400 text-[11px] font-semibold">
                  {user?.username?.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              <span className="hidden sm:inline max-w-[120px] truncate">
                {user?.username || "User"}
              </span>

              <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            side="bottom"
            sideOffset={8}
            className="z-[9999] w-56 rounded-xl border bg-popover p-1 shadow-xl"
          >
            <div className="px-2 py-2">
              <p className="text-sm font-semibold">{user?.username || "User"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email || "No email"}
              </p>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => setCurrentView("settings")}
              className="cursor-pointer rounded-lg"
            >
              <UserCog className="mr-2 h-4 w-4" />
              Account Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={handleLogout}
              className="cursor-pointer rounded-lg text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}