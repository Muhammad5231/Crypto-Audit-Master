'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Ellipsis,
  Plus,
} from 'lucide-react';
import {
  MOBILE_MORE_ITEMS,
  MOBILE_MORE_QUICK_ACTIONS,
  MOBILE_PRIMARY_TABS,
} from '@/lib/constants/navItems';
import { useAppStore, type AppView } from '@/store/appStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

export function MobileNav() {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setPendingManualTrade = useAppStore((s) => s.setPendingManualTrade);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const [openMore, setOpenMore] = useState(false);

  const dashboardTab = useMemo(
    () => MOBILE_PRIMARY_TABS.find((item) => item.view === 'dashboard'),
    []
  );
  const tradesTab = useMemo(
    () => MOBILE_PRIMARY_TABS.find((item) => item.view === 'realized-trades'),
    []
  );
  const holdingsTab = useMemo(
    () => MOBILE_PRIMARY_TABS.find((item) => item.view === 'open-holdings'),
    []
  );
  const showSetupBadge = activeWorkspace?._count?.csvFiles === 0;

  const isFabActive = currentView === 'upload';
  const isMoreActive = MOBILE_MORE_ITEMS.some((item) => item.view === currentView);

  const quickActions = MOBILE_MORE_QUICK_ACTIONS.filter(
    (item) => item.view === 'upload' || item.view === 'export'
  ).sort((a, b) => {
    if (a.view === b.view) return 0;
    if (a.view === 'upload') return -1;
    if (b.view === 'upload') return 1;
    return 0;
  });

  function handlePrimaryNav(view: AppView) {
    setOpenMore(false);
    setCurrentView(view);
  }

  function handleFabAction() {
    setOpenMore(false);
    setPendingManualTrade(true);
    setCurrentView('upload');
  }

  function handleQuickAction(view: AppView) {
    setOpenMore(false);
    if (view === 'upload') {
      setPendingManualTrade(false);
      setCurrentView('upload');
      return;
    }
    setCurrentView(view);
  }

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 lg:hidden" aria-label="Mobile primary navigation">
      <div className="pointer-events-auto px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)]">
        <div className="grid h-[78px] grid-cols-[1fr_1fr_76px_1fr_1fr] items-end rounded-[28px] border border-border/50 bg-card/88 px-1.5 pb-2 pt-2 shadow-[0_18px_50px_rgba(2,8,23,0.18)] backdrop-blur-2xl">
          {dashboardTab ? (
            <MobileNavButton
              label={dashboardTab.shortLabel || dashboardTab.label}
              icon={dashboardTab.icon}
              isActive={currentView === dashboardTab.view}
              onClick={() => handlePrimaryNav(dashboardTab.view)}
            />
          ) : (
            <div />
          )}

          {tradesTab ? (
            <MobileNavButton
              label={tradesTab.shortLabel || tradesTab.label}
              icon={tradesTab.icon}
              isActive={currentView === tradesTab.view}
              onClick={() => handlePrimaryNav(tradesTab.view)}
            />
          ) : (
            <div />
          )}

          <div className="relative flex h-full items-start justify-center">
            <button
              type="button"
              onClick={handleFabAction}
              aria-label="Add manual trade"
              title="Add manual trade"
              className={cn(
                'relative -mt-6 flex h-16 w-16 items-center justify-center rounded-[22px] border-[5px] border-background shadow-[0_14px_34px_rgba(13,148,136,0.32)] transition-all duration-200 active:scale-95',
                isFabActive
                  ? 'bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600'
                  : 'bg-gradient-to-br from-teal-500 to-emerald-600'
              )}
            >
              <motion.div
                animate={{ rotate: isFabActive ? 45 : 0, scale: isFabActive ? 1.04 : 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              >
                <Plus className="h-6 w-6 text-white" strokeWidth={2.6} />
              </motion.div>
              {showSetupBadge ? (
                <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-orange-500" />
              ) : null}
            </button>
          </div>

          {holdingsTab ? (
            <MobileNavButton
              label={holdingsTab.shortLabel || holdingsTab.label}
              icon={holdingsTab.icon}
              isActive={currentView === holdingsTab.view}
              onClick={() => handlePrimaryNav(holdingsTab.view)}
            />
          ) : (
            <div />
          )}

          <Sheet open={openMore} onOpenChange={setOpenMore}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open more navigation"
                title="More"
                className={cn(
                  'relative flex h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-colors',
                  openMore && !isMoreActive ? 'bg-muted/45' : ''
                )}
              >
                {isMoreActive ? (
                  <motion.span
                    layoutId="mobile-nav-active"
                    className="absolute inset-0 rounded-2xl border border-teal-500/20 bg-teal-500/10"
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  />
                ) : null}
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <Ellipsis
                    className={cn(
                      'h-[20px] w-[20px] transition-colors',
                      isMoreActive ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground'
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-semibold',
                      isMoreActive ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground'
                    )}
                  >
                    More
                  </span>
                </div>
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              hideClose
              className="max-h-[86dvh] rounded-t-[30px] border-x-0 border-b-0 bg-background/96 px-0 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
            >
              <SheetHeader className="border-b border-border/50 px-4 pb-3 pt-3 text-left">
                <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted" />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <SheetTitle className="text-left text-base">More</SheetTitle>
                    <SheetDescription className="text-left">
                      Secondary pages and utility actions
                    </SheetDescription>
                  </div>
                  <SheetClose asChild>
                    <Button variant="ghost" size="sm" className="h-9 rounded-xl px-3 text-xs">
                      Done
                    </Button>
                  </SheetClose>
                </div>
              </SheetHeader>

              <div className="px-4 py-4">
                <div className="grid grid-cols-2 gap-2.5">
                  {quickActions.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.view;
                    return (
                      <button
                        key={item.view}
                        type="button"
                        onClick={() => handleQuickAction(item.view)}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors',
                          isActive
                            ? 'border-teal-500/35 bg-teal-500/10'
                            : 'border-border/50 bg-card/60 hover:bg-muted/35'
                        )}
                        aria-label={item.label}
                        title={item.label}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                            item.view === 'upload' ? 'bg-teal-500/10' : 'bg-orange-500/10'
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-4.5 w-4.5',
                              item.view === 'upload'
                                ? 'text-teal-600 dark:text-teal-400'
                                : 'text-orange-600 dark:text-orange-400'
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{item.shortLabel || item.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.view === 'upload' ? 'Open upload center' : 'Generate report files'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <ScrollArea className="mt-4 max-h-[48dvh] pr-1">
                  <div className="space-y-1">
                    {MOBILE_MORE_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.view;

                      return (
                        <button
                          key={item.view}
                          type="button"
                          onClick={() => handlePrimaryNav(item.view)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors',
                            isActive
                              ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                              : 'text-foreground hover:bg-muted/40'
                          )}
                          aria-label={item.label}
                          title={item.label}
                        >
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                              isActive ? 'bg-teal-500/15' : 'bg-muted/55'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-[18px] w-[18px]',
                                isActive ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground'
                              )}
                            />
                          </div>
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          {isActive ? <div className="h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-400" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

function MobileNavButton({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative flex h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-colors"
    >
      {isActive ? (
        <motion.span
          layoutId="mobile-nav-active"
          className="absolute inset-0 rounded-2xl border border-teal-500/20 bg-teal-500/10"
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        />
      ) : null}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <Icon
          className={cn(
            'h-[20px] w-[20px] transition-colors',
            isActive ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground'
          )}
        />
        <span
          className={cn(
            'text-[10px] font-semibold',
            isActive ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
      </div>
    </button>
  );
}
