'use client';

import { useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore, type AppView } from "@/store/appStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  BarChart3,
  FileCheck,
  Settings,
  StickyNote,
  FileDown,
  FileText,
  HelpCircle,
  Palette,
  Upload,
  Grid3X3,
} from "lucide-react";

const BOTTOM_TABS = [
  { key: 'dashboard', view: 'dashboard' as AppView, label: 'Home' },
  { key: 'realized-trades', view: 'realized-trades' as AppView, label: 'Trades' },
  { key: 'open-holdings', view: 'open-holdings' as AppView, label: 'Holdings' },
  { key: 'analytics', view: 'analytics' as AppView, label: 'Charts' },
];

const ICON_MAP: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  'realized-trades': ArrowRightLeft,
  'open-holdings': Wallet,
  analytics: BarChart3,
  workspaces: Grid3X3,
  'tax-summary': FileCheck,
  'exchange-settings': Settings,
  notes: StickyNote,
  export: FileDown,
  'export-history': FileText,
  upload: Upload,
  documentation: HelpCircle,
  settings: Palette,
};

const MORE_NAV = [
  { view: 'workspaces' as AppView, label: 'Workspaces' },
  { view: 'tax-summary' as AppView, label: 'Tax Summary' },
  { view: 'exchange-settings' as AppView, label: 'Exchange Settings' },
  { view: 'notes' as AppView, label: 'Notes' },
  { view: 'export' as AppView, label: 'Export Report' },
  { view: 'export-history' as AppView, label: 'Export History' },
  { view: 'documentation' as AppView, label: 'Documentation' },
  { view: 'settings' as AppView, label: 'Settings' },
];

export function MobileNav() {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setPendingManualTrade = useAppStore((s) => s.setPendingManualTrade);
  const [tappedTab, setTappedTab] = useState<string | null>(null);
  const [openMore, setOpenMore] = useState(false);

  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const showUploadBadge = activeWorkspace?._count?.csvFiles === 0;

  const handleTabTap = (view: AppView) => {
    setTappedTab(view);
    setCurrentView(view);
    setTimeout(() => setTappedTab(null), 300);
  };

  const handleUploadTap = () => {
    setPendingManualTrade(true);
    setCurrentView("upload");
  };

  const isMoreActive = !BOTTOM_TABS.some((t) => t.view === currentView);

  const activeTabIndex = BOTTOM_TABS.findIndex((t) => t.view === currentView);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="px-3 pb-[max(8px,env(safe-area-inset-bottom))]">
          <div className="relative flex items-end justify-around bg-card/90 backdrop-blur-2xl rounded-2xl border border-border/40 shadow-2xl shadow-black/10 dark:shadow-black/30 pt-2 pb-2">
            {/* Active pill indicator */}
            <AnimatePresence>
              {activeTabIndex >= 0 && (
                <motion.div
                  layoutId="mobile-active-pill"
                  className="absolute top-2 h-[44px] rounded-xl bg-teal-500/8 dark:bg-teal-400/8 border border-teal-500/15 dark:border-teal-400/15"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  style={{
                    left: activeTabIndex < 2
                      ? `calc(${activeTabIndex * 20}% + 2px)`
                      : `calc(${(activeTabIndex + 1) * 20}% + 2px)`,
                    width: 'calc(20% - 6px)',
                  }}
                />
              )}
            </AnimatePresence>

            {/* Tab buttons */}
            {BOTTOM_TABS.map((tab, idx) => {
              const isActive = currentView === tab.view;
              const Icon = ICON_MAP[tab.key] || LayoutDashboard;
              const isLeft = idx < 2;

              return (
                <button
                  key={tab.view}
                  onClick={() => handleTabTap(tab.view)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] z-10 transition-all",
                    isLeft ? "w-[20%]" : "w-[20%]"
                  )}
                >
                  <motion.div
                    animate={{
                      scale: tappedTab === tab.view
                        ? [1, 0.85, 1.05, 1]
                        : isActive ? 1.08 : 1,
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <Icon
                      className={cn(
                        "h-[21px] w-[21px] transition-colors duration-200",
                        isActive
                          ? "text-teal-600 dark:text-teal-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </motion.div>
                  <motion.span
                    className={cn(
                      "text-[10px] font-semibold transition-colors duration-200",
                      isActive
                        ? "text-teal-600 dark:text-teal-400"
                        : "text-muted-foreground"
                    )}
                    animate={{
                      scale: tappedTab === tab.view ? [1, 0.88, 1.03, 1] : 1,
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {tab.label}
                  </motion.span>
                </button>
              );
            })}

            {/* More Sheet Button */}
            <Sheet open={openMore} onOpenChange={setOpenMore}>
              <SheetTrigger asChild>
                <button
                  className="relative flex flex-col items-center justify-center gap-0.5 w-[20%] min-h-[44px] z-10"
                >
                  <motion.div
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-xl transition-colors duration-200",
                      isMoreActive ? "bg-teal-500/10" : ""
                    )}
                    animate={{
                      scale: tappedTab === "more" ? [1, 0.85, 1.05, 1] : 1,
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <svg
                      className={cn(
                        "h-[21px] w-[21px] transition-colors duration-200",
                        isMoreActive
                          ? "text-teal-600 dark:text-teal-400"
                          : "text-muted-foreground"
                      )}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </motion.div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold transition-colors duration-200",
                      isMoreActive
                        ? "text-teal-600 dark:text-teal-400"
                        : "text-muted-foreground"
                    )}
                  >
                    More
                  </span>
                </button>
              </SheetTrigger>

              <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh]">
                <SheetHeader className="pt-2 pb-3 px-5">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-left text-lg font-bold">More Options</SheetTitle>
                    <button
                      onClick={() => { setOpenMore(false); handleUploadTap(); }}
                      className="flex items-center gap-2 rounded-xl bg-teal-500/10 px-3.5 py-2 text-sm font-semibold text-teal-600 dark:text-teal-400 transition-colors active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      Add Trade
                    </button>
                  </div>
                </SheetHeader>
                <ScrollArea className="h-[calc(80vh-80px)]">
                  <div className="px-4 pb-8 space-y-1">
                    {/* Quick action tiles */}
                    <div className="grid grid-cols-2 gap-2.5 pb-4 mb-3 border-b border-border/30">
                      {[
                        { view: 'upload' as AppView, label: 'Upload Center', icon: Upload, bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
                        { view: 'export' as AppView, label: 'Export Report', icon: FileDown, bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
                        { view: 'workspaces' as AppView, label: 'Workspaces', icon: Grid3X3, bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
                        { view: 'settings' as AppView, label: 'Settings', icon: Palette, bg: 'bg-muted/60', text: 'text-muted-foreground' },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <SheetClose key={item.view} asChild>
                            <button
                              onClick={() => setCurrentView(item.view)}
                              className="flex flex-col items-center gap-2.5 rounded-2xl border border-border/30 p-4 transition-all active:scale-[0.97] hover:bg-muted/30"
                            >
                              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", item.bg)}>
                                <Icon className={cn("h-5 w-5", item.text)} />
                              </div>
                              <span className="text-xs font-semibold text-foreground">{item.label}</span>
                            </button>
                          </SheetClose>
                        );
                      })}
                    </div>

                    {/* Full nav list */}
                    {MORE_NAV.map((item) => {
                      const isActive = currentView === item.view;
                      const Icon = ICON_MAP[item.view] || LayoutDashboard;
                      return (
                        <SheetClose key={item.view} asChild>
                          <button
                            onClick={() => setCurrentView(item.view)}
                            className={cn(
                              "flex items-center gap-3.5 w-full rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                              isActive
                                ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                                : "text-foreground hover:bg-muted/50"
                            )}
                          >
                            <div className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                              isActive ? "bg-teal-500/15" : "bg-muted/60"
                            )}>
                              <Icon className={cn(
                                "h-[18px] w-[18px]",
                                isActive ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"
                              )} />
                            </div>
                            <span className="flex-1 text-left">{item.label}</span>
                            {isActive && (
                              <div className="h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-400" />
                            )}
                          </button>
                        </SheetClose>
                      );
                    })}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* Center FAB - floating above the bar */}
            <button
              onClick={handleUploadTap}
              className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center justify-center w-[56px] h-[56px] rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 dark:from-teal-600 dark:to-emerald-700 shadow-lg shadow-teal-500/30 dark:shadow-teal-500/20 z-30 active:scale-90 transition-transform border-4 border-background"
            >
              <motion.div
                whileTap={{ scale: 0.9, rotate: 90 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
              </motion.div>
              {showUploadBadge && (
                <motion.span
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white shadow-sm border-2 border-background"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  !
                </motion.span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
