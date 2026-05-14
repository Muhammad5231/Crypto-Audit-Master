'use client';

import { useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Upload,
  ArrowRightLeft,
  Wallet,
  BarChart3,
  Receipt,
  Settings,
  StickyNote,
  Download,
  BookOpen,
  FileUp,
  Play,
  PenLine,
  FileDown,
  Moon,
  Sun,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command';
import { useAppStore } from '@/store/appStore';
import { useCommandPaletteStore } from '@/store/commandPaletteStore';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface CommandItemDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const { isOpen, close, toggle } = useCommandPaletteStore();
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const { setTheme, resolvedTheme } = useTheme();
  const { workspaces: ws, activeWorkspace, setActiveWorkspace } = useWorkspaceStore();
  const workspaces = ws ?? [];

  // Navigation commands
  const navigationCommands: CommandItemDef[] = [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      icon: LayoutDashboard,
      shortcut: 'G+D',
      action: () => setCurrentView('dashboard'),
    },
    {
      id: 'nav-upload',
      label: 'Go to Upload',
      icon: Upload,
      shortcut: 'G+U',
      action: () => setCurrentView('upload'),
    },
    {
      id: 'nav-trades',
      label: 'Go to Trades',
      icon: ArrowRightLeft,
      shortcut: 'G+T',
      action: () => setCurrentView('realized-trades'),
    },
    {
      id: 'nav-holdings',
      label: 'Go to Holdings',
      icon: Wallet,
      shortcut: 'G+H',
      action: () => setCurrentView('open-holdings'),
    },
    {
      id: 'nav-analytics',
      label: 'Go to Analytics',
      icon: BarChart3,
      shortcut: 'G+A',
      action: () => setCurrentView('analytics'),
    },
    {
      id: 'nav-tax-summary',
      label: 'Go to Tax Summary',
      icon: Receipt,
      shortcut: 'G+S',
      action: () => setCurrentView('tax-summary'),
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      icon: Settings,
      shortcut: 'G+,',
      action: () => setCurrentView('settings'),
    },
    {
      id: 'nav-notes',
      label: 'Go to Notes',
      icon: StickyNote,
      shortcut: 'G+N',
      action: () => setCurrentView('notes'),
    },
    {
      id: 'nav-export',
      label: 'Go to Export',
      icon: Download,
      shortcut: 'G+E',
      action: () => setCurrentView('export'),
    },
    {
      id: 'nav-documentation',
      label: 'Go to Documentation',
      icon: BookOpen,
      shortcut: 'G+?',
      action: () => setCurrentView('documentation'),
    },
  ];

  // Action commands
  const actionCommands: CommandItemDef[] = [
    {
      id: 'action-upload-csv',
      label: 'Upload CSV',
      icon: FileUp,
      action: () => setCurrentView('upload'),
    },
    {
      id: 'action-process-trades',
      label: 'Process Trades',
      icon: Play,
      action: () => setCurrentView('upload'),
    },
    {
      id: 'action-create-note',
      label: 'Create Note',
      icon: PenLine,
      action: () => setCurrentView('notes'),
    },
    {
      id: 'action-export-report',
      label: 'Export Report',
      icon: FileDown,
      action: () => setCurrentView('export'),
    },
  ];

  // Settings commands
  const settingsCommands: CommandItemDef[] = [
    {
      id: 'settings-dark-mode',
      label: resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon: resolvedTheme === 'dark' ? Sun : Moon,
      action: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
    },
  ];

  // Handle Ctrl+K / Cmd+K shortcut
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    },
    [toggle]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const runCommand = useCallback(
    (command: CommandItemDef) => {
      close();
      command.action();
    },
    [close]
  );

  const runWorkspaceSwitch = useCallback(
    (workspace: typeof workspaces[number]) => {
      close();
      setActiveWorkspace(workspace);
    },
    [close, setActiveWorkspace]
  );

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) close();
      }}
      className="rounded-2xl max-w-lg"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationCommands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <CommandItem
                key={cmd.id}
                onSelect={() => runCommand(cmd)}
                className="gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
              >
                <Icon className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>{cmd.label}</span>
                {cmd.shortcut && (
                  <CommandShortcut className="text-[10px] tracking-wider">
                    {cmd.shortcut}
                  </CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actionCommands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <CommandItem
                key={cmd.id}
                onSelect={() => runCommand(cmd)}
                className="gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
              >
                <Icon className="h-4 w-4 text-orange-500 dark:text-orange-400 shrink-0" />
                <span>{cmd.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {workspaces.length > 1 && (
          <>
            <CommandSeparator />

            <CommandGroup heading="Switch Workspace">
              {workspaces.map((ws) => {
                const isActive = activeWorkspace?.id === ws.id;
                return (
                  <CommandItem
                    key={ws.id}
                    onSelect={() => runWorkspaceSwitch(ws)}
                    className="gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
                  >
                    <span
                      className="h-4 w-4 rounded-full shrink-0 border border-border/50"
                      style={{ backgroundColor: ws.color || '#6b7280' }}
                    />
                    <span className="flex-1">{ws.name}</span>
                    {isActive && (
                      <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                        Active
                      </span>
                    )}
                    {ws.icon && (
                      <span className="text-sm text-muted-foreground">{ws.icon}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Settings">
          {settingsCommands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <CommandItem
                key={cmd.id}
                onSelect={() => runCommand(cmd)}
                className="gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{cmd.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
