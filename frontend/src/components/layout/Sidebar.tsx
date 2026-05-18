'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { SIDEBAR_ITEMS } from '@/lib/constants/navItems';

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const onCreateWorkspace = useAppStore((s) => s.onCreateWorkspace);

  function handleLogout() {
    clearAuth();
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen border-r border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo + Workspace */}
      <div className="p-3 space-y-3">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-2.5 py-2",
            collapsed ? "justify-center" : ""
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-foreground truncate">
                Crypto Audit
              </span>
              {activeWorkspace ? (
                <div className="flex items-center gap-1.5">
                  <motion.div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: activeWorkspace.color || "#0d9488" }}
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [1, 0.6, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <span className="text-[11px] text-muted-foreground truncate">
                    {activeWorkspace.name}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  No workspace
                </span>
              )}
            </div>
          )}
        </div>

        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 text-xs"
            onClick={onCreateWorkspace}
          >
            <Plus className="h-3.5 w-3.5" />
            New Workspace
          </Button>
        )}
      </div>

      <Separator className="opacity-50" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2.5 py-2">
        <nav className="space-y-0.5">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = currentView === item.view;
            const Icon = item.icon;

            const button = (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className={cn(
                  "group flex items-center gap-2.5 w-full rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200 relative",
                  isActive
                    ? "bg-muted/60 backdrop-blur-sm text-teal-600 dark:text-teal-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  collapsed ? "justify-center px-0" : ""
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bar"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-gradient-to-b from-teal-500 to-emerald-400"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  isActive
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-muted-foreground group-hover:text-foreground"
                )} />
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && (
                  <motion.div
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-500 dark:bg-teal-400"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.view}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </nav>
      </ScrollArea>

      {/* Bottom - User + Collapse */}
      <div className="mt-auto p-2.5 space-y-1">
        <Separator className="opacity-50 mb-2" />

        {/* User section */}
        {user && (
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-muted/50 transition-colors",
              collapsed ? "justify-center" : ""
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-teal-600/10 text-teal-600 dark:text-teal-400 text-xs font-semibold">
                {(user?.username || "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground truncate">
                  {user?.username || 'User'}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {user?.email || ''}
                </span>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Collapse button */}
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="flex items-center justify-center w-full rounded-xl py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
