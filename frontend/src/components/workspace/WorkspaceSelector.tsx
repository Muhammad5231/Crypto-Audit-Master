'use client';

import { useEffect, useState } from 'react';
import { Briefcase, Check, ChevronDown, ChevronsUpDown, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAppStore } from '@/store/appStore';
import { workspaceApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export function WorkspaceSelector() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { workspaces: ws, activeWorkspace, setActiveWorkspace, setWorkspaces } =
    useWorkspaceStore();
  const onCreateWorkspace = useAppStore((s) => s.onCreateWorkspace);
  const workspaces = ws ?? [];

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    setIsLoading(true);
    try {
      const data = await workspaceApi.list();
      const wsList = Array.isArray(data?.workspaces) ? data.workspaces : [];
      setWorkspaces(wsList);
      if (!activeWorkspace && wsList.length > 0) {
        setActiveWorkspace(wsList[0]);
      }
    } catch {
      // Silent fail: unauthenticated users do not need this.
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelect(workspaceId: string) {
    const workspace = workspaces.find((item) => item.id === workspaceId);
    if (!workspace) return;

    setActiveWorkspace(workspace);
    try {
      await workspaceApi.updateLastOpened(workspaceId);
    } catch {
      // Non-critical analytics update
    }
    setIsOpen(false);
  }

  function handleCreateWorkspace() {
    setIsOpen(false);
    window.setTimeout(() => {
      onCreateWorkspace();
    }, 120);
  }

  const trigger = (
    <button
      type="button"
      className={cn(
        'flex h-9 items-center gap-2 rounded-full border border-border/50 bg-muted/35 px-3 text-xs font-semibold text-foreground transition-colors',
        'hover:bg-muted/55 hover:border-border/70',
        isMobile ? 'max-w-[120px]' : 'max-w-[220px] rounded-xl px-2.5 text-sm font-medium'
      )}
      disabled={isLoading}
      aria-label={activeWorkspace ? `Current workspace ${activeWorkspace.name}` : 'Select workspace'}
      title={activeWorkspace?.name || 'Select workspace'}
    >
      {activeWorkspace ? (
        <>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: activeWorkspace.color || '#0d9488' }}
          />
          <span className="truncate">{activeWorkspace.name}</span>
        </>
      ) : (
        <>
          <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{isMobile ? 'Workspace' : 'No Workspace'}</span>
        </>
      )}
      {isMobile ? (
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
    </button>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="max-h-[82dvh] rounded-t-[28px] border-x-0 border-b-0 px-0 pb-0">
          <SheetHeader className="border-b border-border/50 px-4 pb-3 pt-4 text-left">
            <SheetTitle className="text-left">Switch Workspace</SheetTitle>
            <SheetDescription className="text-left">
              Choose the workspace you want to review right now.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 py-4">
            <ScrollArea className="max-h-[48dvh] pr-1">
              <div className="space-y-2">
                {workspaces.length > 0 ? (
                  workspaces.map((workspace) => {
                    const isActive = activeWorkspace?.id === workspace.id;
                    return (
                      <button
                        key={workspace.id}
                        type="button"
                        onClick={() => handleSelect(workspace.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors',
                          isActive
                            ? 'border-teal-500/40 bg-teal-500/8'
                            : 'border-border/50 bg-card/60 hover:bg-muted/35'
                        )}
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: workspace.color || '#0d9488' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{workspace.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {workspace.financialYear ? `FY ${workspace.financialYear}` : 'Financial year not set'}
                          </p>
                        </div>
                        {isActive ? (
                          <Check className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                    No workspaces yet
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="mt-4 flex gap-2 border-t border-border/50 pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline" className="h-11 flex-1 rounded-2xl">
                  Close
                </Button>
              </SheetClose>
              <Button
                type="button"
                onClick={handleCreateWorkspace}
                className="h-11 flex-1 rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New Workspace
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-64 rounded-xl p-1.5">
        {workspaces.length > 0 ? (
          workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => handleSelect(workspace.id)}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2',
                activeWorkspace?.id === workspace.id ? 'bg-muted/80' : ''
              )}
            >
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: workspace.color || '#0d9488' }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{workspace.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {workspace._count?.trades ?? 0} trades
                  {workspace.financialYear ? ` · FY ${workspace.financialYear}` : ''}
                </p>
              </div>
              {activeWorkspace?.id === workspace.id ? (
                <Check className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              ) : null}
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No workspaces yet
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleCreateWorkspace}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-teal-600 dark:text-teal-400"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">Create Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
