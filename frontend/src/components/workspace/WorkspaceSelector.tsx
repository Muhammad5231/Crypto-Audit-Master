'use client';

import { useEffect, useState } from "react";
import {
  ChevronsUpDown,
  Plus,
  Check,
  Briefcase,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAppStore } from "@/store/appStore";
import { workspaceApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function WorkspaceSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { workspaces: ws, activeWorkspace, setActiveWorkspace, setWorkspaces } =
    useWorkspaceStore();
  const workspaces = ws ?? [];
  const onCreateWorkspace = useAppStore((s) => s.onCreateWorkspace);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    setIsLoading(true);
    try {
      const data = await workspaceApi.list();
      const wsList = Array.isArray(data?.workspaces) ? data.workspaces : [];
      setWorkspaces(wsList);
      if (
        !activeWorkspace &&
        wsList.length > 0
      ) {
        setActiveWorkspace(wsList[0]);
      }
    } catch {
      // Silent fail — may not be authenticated
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelect(workspaceId: string) {
    const ws = workspaces?.find((w) => w.id === workspaceId);
    if (!ws) return;

    setActiveWorkspace(ws);
    try {
      await workspaceApi.updateLastOpened(workspaceId);
    } catch {
      // Non-critical
    }
    setIsOpen(false);
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-colors",
            "hover:bg-muted/50 border border-transparent hover:border-border/50",
            activeWorkspace
              ? "text-foreground"
              : "text-muted-foreground"
          )}
          disabled={isLoading}
        >
          {activeWorkspace ? (
            <>
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: activeWorkspace.color || "#0d9488",
                }}
              />
              <span className="hidden sm:inline max-w-[160px] truncate">
                {activeWorkspace.name}
              </span>
              <span className="sm:hidden max-w-[100px] truncate">
                {activeWorkspace.name}
              </span>
            </>
          ) : (
            <>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>No Workspace</span>
            </>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 rounded-xl p-1.5">
        {workspaces?.length > 0 ? (
          workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => handleSelect(ws.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg cursor-pointer py-2 px-2",
                activeWorkspace?.id === ws.id
                  ? "bg-muted/80"
                  : ""
              )}
            >
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: ws.color || "#0d9488" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ws.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {ws._count?.trades ?? 0} trades
                  {ws.financialYear ? ` · FY ${ws.financialYear}` : ""}
                </p>
              </div>
              {activeWorkspace?.id === ws.id && (
                <Check className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No workspaces yet
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setIsOpen(false);
            onCreateWorkspace();
          }}
          className="flex items-center gap-2.5 rounded-lg cursor-pointer text-teal-600 dark:text-teal-400 py-2 px-2"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">Create Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
