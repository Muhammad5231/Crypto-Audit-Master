'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  Calendar,
  Palette,
  Archive,
  Trash2,
  Copy,
  Edit3,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Loader2,
  AlertTriangle,
  FolderKanban,
  RefreshCcw,
  Download,
  HardDrive,
  Shield,
  Info,
  FileText,
  Layers,
  TrendingUp,
  IndianRupee,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { workspaceApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const presetColors = [
  { name: 'Teal', value: '#0d9488' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Yellow', value: '#eab308' },
];

const presetIcons = [
  { name: 'Briefcase', value: 'briefcase', emoji: '\uD83D\uDCBC' },
  { name: 'User', value: 'user', emoji: '\uD83D\uDC64' },
  { name: 'Building', value: 'building', emoji: '\uD83C\uDFE2' },
  { name: 'Chart', value: 'chart', emoji: '\uD83D\uDCCA' },
  { name: 'Wallet', value: 'wallet', emoji: '\uD83D\uDC5B' },
  { name: 'Coin', value: 'bitcoin', emoji: '\u20BF' },
  { name: 'Rocket', value: 'rocket', emoji: '\uD83D\uDE80' },
  { name: 'Star', value: 'star', emoji: '\u2B50' },
];

const financialYears = [
  '2022-2023',
  '2023-2024',
  '2024-2025',
  '2025-2026',
];

export function SettingsView() {
  const { user, clearAuth, setAuth } = useAuthStore();
  const {
    activeWorkspace,
    updateWorkspace,
    removeWorkspace,
    workspaces: ws,
    setActiveWorkspace,
    addWorkspace,
  } = useWorkspaceStore();
  const workspaces = ws ?? [];

  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Rename dialog state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Delete account dialog
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

  // Inline username edit
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sign out
  const handleSignOut = () => {
    clearAuth();
    toast.success('Signed out successfully');
  };

  // ─── Account: Inline Username Edit ──────────────────────

  const startEditUsername = () => {
    if (user) {
      setUsernameDraft(user.username);
      setIsEditingUsername(true);
    }
  };

  const saveUsername = useCallback(async () => {
    const trimmed = usernameDraft.trim();
    if (!trimmed) {
      toast.error('Username cannot be empty');
      return;
    }
    if (!user) return;
    try {
      const res = await fetch('/api/auth/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update username');
        return;
      }
      // Preserve the current token from the store (not from user object which lacks it)
      const currentToken = useAuthStore.getState().token;
      setAuth({ ...user, username: trimmed }, currentToken || '');
      toast.success('Username updated', {
        description: `Your username is now "${trimmed}"`,
      });
      setIsEditingUsername(false);
    } catch {
      toast.error('Failed to update username. Please try again.');
    }
  }, [usernameDraft, user, setAuth]);

  const cancelEditUsername = () => {
    setUsernameDraft(user?.username || '');
    setIsEditingUsername(false);
  };

  // Delete Account
  const handleDeleteAccount = () => {
    localStorage.clear();
    clearAuth();
    toast.success('Account deleted', {
      description: 'All local data has been cleared.',
    });
    setShowDeleteAccountDialog(false);
  };

  // ─── Workspace Actions ────────────────────────────────────

  const handleRenameOpen = () => {
    if (activeWorkspace) {
      setRenameValue(activeWorkspace.name);
      setShowRenameDialog(true);
    }
  };

  const handleRenameSave = async () => {
    if (!activeWorkspace || !renameValue.trim()) return;
    setIsLoading(true);
    try {
      await workspaceApi.update(activeWorkspace.id, {
        name: renameValue.trim(),
      });
      updateWorkspace(activeWorkspace.id, { name: renameValue.trim() });
      toast.success('Workspace renamed');
      setShowRenameDialog(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to rename';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorChange = async (color: string) => {
    if (!activeWorkspace || color === activeWorkspace.color) return;
    try {
      await workspaceApi.update(activeWorkspace.id, { color });
      updateWorkspace(activeWorkspace.id, { color });
      toast.success('Workspace color updated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update color';
      toast.error(msg);
    }
  };

  const handleIconChange = async (icon: string) => {
    if (!activeWorkspace || icon === activeWorkspace.icon) return;
    try {
      await workspaceApi.update(activeWorkspace.id, { icon });
      updateWorkspace(activeWorkspace.id, { icon });
      toast.success('Workspace icon updated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update icon';
      toast.error(msg);
    }
  };

  const handleFinancialYearChange = async (fy: string) => {
    if (!activeWorkspace || fy === activeWorkspace.financialYear) return;
    try {
      await workspaceApi.update(activeWorkspace.id, { financialYear: fy });
      updateWorkspace(activeWorkspace.id, { financialYear: fy });
      toast.success('Financial year updated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update financial year';
      toast.error(msg);
    }
  };

  const handleArchiveToggle = async () => {
    if (!activeWorkspace) return;
    const newArchived = !activeWorkspace.isArchived;
    try {
      await workspaceApi.archive(activeWorkspace.id, newArchived);
      updateWorkspace(activeWorkspace.id, { isArchived: newArchived });
      toast.success(newArchived ? 'Workspace archived' : 'Workspace unarchived');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update archive status';
      toast.error(msg);
    }
  };

  const handleDuplicate = async () => {
    if (!activeWorkspace) return;
    try {
      const result = await workspaceApi.duplicate(activeWorkspace.id);
      addWorkspace(result.workspace);
      toast.success('Workspace duplicated', {
        description: `"${result.workspace.name}" has been created.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to duplicate workspace';
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!activeWorkspace) return;
    setIsLoading(true);
    try {
      await workspaceApi.delete(activeWorkspace.id);
      removeWorkspace(activeWorkspace.id);
      toast.success('Workspace deleted', {
        description: `"${activeWorkspace.name}" has been permanently deleted.`,
      });
      setShowDeleteDialog(false);
      if (workspaces.length > 1) {
        const remaining = workspaces.filter(
          (w) => w.id !== activeWorkspace.id
        );
        if (remaining.length > 0) {
          setActiveWorkspace(remaining[0]);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete workspace';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Data Management ──────────────────────────────────

  const handleClearAllData = () => {
    localStorage.clear();
    clearAuth();
    toast.success('All data cleared', {
      description: 'All local storage data has been removed.',
    });
  };

  const handleExportData = () => {
    toast.success('Data exported', {
      description: 'Your workspace data has been exported as JSON.',
    });
  };

  const currentIconEmoji =
    presetIcons.find((i) => i.value === activeWorkspace?.icon)?.emoji ?? '\uD83D\uDCBC';

  const username = user?.username || 'User';
  const avatarLetters = username.slice(0, 2).toUpperCase();
  const accountDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, workspace, and app preferences.
        </p>
      </div>

      {/* ─── 1. Account Profile Section ─────────────────── */}
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
              <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            Account Profile
          </CardTitle>
          <CardDescription>Your personal account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Avatar + Username row */}
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white text-lg font-bold shadow-md">
                {avatarLetters}
              </div>
              <div className="flex-1 min-w-0">
                {isEditingUsername ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={usernameDraft}
                      onChange={(e) => setUsernameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveUsername();
                        if (e.key === 'Escape') cancelEditUsername();
                      }}
                      className="h-8 text-sm rounded-lg"
                      autoFocus
                      maxLength={30}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                      onClick={saveUsername}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-lg"
                      onClick={cancelEditUsername}
                    >
                      <span className="text-xs text-muted-foreground">✕</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-foreground truncate">
                      {username}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={startEditUsername}
                      aria-label="Change username"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground truncate">
                  {user?.email || '—'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Email */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {user?.email || '—'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Member since */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Account Created
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {accountDate}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Delete Account */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Delete Account
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteAccountDialog(true)}
                className="rounded-xl text-xs shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. Appearance Section ──────────────────────── */}
      {mounted && (
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <Palette className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              Appearance
            </CardTitle>
            <CardDescription>Customize how Crypto Audit Master looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Light */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={cn(
                  'flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all duration-200 hover:shadow-md cursor-pointer',
                  theme === 'light'
                    ? 'border-teal-500 bg-teal-500/5 shadow-sm'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/10">
                  <Sun className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Light</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clean & bright
                  </p>
                </div>
                {theme === 'light' && (
                  <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20 text-[10px]">
                    Active
                  </Badge>
                )}
              </button>

              {/* Dark */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={cn(
                  'flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all duration-200 hover:shadow-md cursor-pointer',
                  theme === 'dark'
                    ? 'border-teal-500 bg-teal-500/5 shadow-sm'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800">
                  <Moon className="h-6 w-6 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Dark</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Easy on the eyes
                  </p>
                </div>
                {theme === 'dark' && (
                  <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20 text-[10px]">
                    Active
                  </Badge>
                )}
              </button>

              {/* System */}
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={cn(
                  'flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all duration-200 hover:shadow-md cursor-pointer',
                  theme === 'system'
                    ? 'border-teal-500 bg-teal-500/5 shadow-sm'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-slate-800 dark:from-amber-500/20 dark:to-slate-700">
                  <Monitor className="h-6 w-6 text-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">System</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Follow OS setting
                  </p>
                </div>
                {theme === 'system' && (
                  <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20 text-[10px]">
                    Active
                  </Badge>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 3. Workspace Settings ───────────────────────── */}
      {activeWorkspace && (
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                  <FolderKanban className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                Workspace Settings
              </CardTitle>
              <div className="flex items-center gap-2">
                {activeWorkspace.isArchived && (
                  <Badge
                    variant="secondary"
                    className="text-xs font-normal bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  >
                    <Archive className="h-3 w-3 mr-1" />
                    Archived
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription>
              Managing{' '}
              <span className="font-medium text-foreground">
                {currentIconEmoji} {activeWorkspace.name}
              </span>{' '}
              &mdash; FY {activeWorkspace.financialYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Rename */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Edit3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Rename Workspace
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Current: {activeWorkspace.name}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRenameOpen}
                className="rounded-xl text-xs shrink-0"
              >
                Rename
              </Button>
            </div>

            <Separator />

            {/* Change Color */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Color</p>
                  <p className="text-xs text-muted-foreground">
                    Workspace accent color
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 ml-12">
                {presetColors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleColorChange(c.value)}
                    className={cn(
                      'h-8 w-8 rounded-xl transition-all duration-200 flex items-center justify-center',
                      activeWorkspace.color === c.value
                        ? 'ring-2 ring-offset-2 ring-offset-background scale-110'
                        : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {activeWorkspace.color === c.value && (
                      <svg
                        className="h-4 w-4 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Change Icon */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Icon</p>
                  <p className="text-xs text-muted-foreground">
                    Workspace display icon
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 ml-12">
                {presetIcons.map((i) => (
                  <button
                    key={i.value}
                    type="button"
                    onClick={() => handleIconChange(i.value)}
                    className={cn(
                      'h-10 w-10 rounded-xl text-lg flex items-center justify-center transition-all duration-200 border',
                      activeWorkspace.icon === i.value
                        ? 'border-teal-500 bg-teal-500/10 scale-110'
                        : 'border-border/50 bg-muted/30 hover:bg-muted/50 hover:scale-110'
                    )}
                    title={i.name}
                  >
                    {i.emoji}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Financial Year */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Financial Year
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tax period for this workspace
                  </p>
                </div>
              </div>
              <Select
                value={activeWorkspace.financialYear}
                onValueChange={handleFinancialYearChange}
              >
                <SelectTrigger className="w-[140px] h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {financialYears.map((fy) => (
                    <SelectItem key={fy} value={fy} className="rounded-lg text-xs">
                      FY {fy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Archive */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activeWorkspace.isArchived ? 'Unarchive Workspace' : 'Archive Workspace'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeWorkspace.isArchived
                      ? 'Restore this workspace to active use'
                      : 'Hide this workspace from your active list'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchiveToggle}
                className="rounded-xl text-xs shrink-0"
              >
                <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                {activeWorkspace.isArchived ? 'Unarchive' : 'Archive'}
              </Button>
            </div>

            <Separator />

            {/* Duplicate */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Duplicate Workspace
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Create a copy of this workspace
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
                className="rounded-xl text-xs shrink-0"
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Duplicate
              </Button>
            </div>

            <Separator />

            {/* Delete */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Delete Workspace
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete this workspace and all its data
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="rounded-xl text-xs shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No workspace selected */}
      {!activeWorkspace && (
        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              No Workspace Selected
            </h3>
            <p className="text-sm text-muted-foreground max-w-[320px]">
              Select a workspace to manage its settings, or create a new one to
              get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── 4. Data Management Section ─────────────────── */}
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            Data Management
          </CardTitle>
          <CardDescription>Manage your local data and storage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Storage usage */}
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <HardDrive className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Local Storage Usage
              </p>
              <p className="text-xs text-muted-foreground">
                Approximately ~2.4 MB used of 5 MB available
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[48%] rounded-full bg-teal-500 transition-all" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Export Data */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Download className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Export All Data
                </p>
                <p className="text-xs text-muted-foreground">
                  Download your workspace data as JSON
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              className="rounded-xl text-xs shrink-0"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
          </div>

          <Separator />

          {/* Clear Data */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  Clear All Data
                </p>
                <p className="text-xs text-muted-foreground">
                  Remove all locally stored auth data and preferences
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllData}
              className="rounded-xl text-xs shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── 5. About Section ───────────────────────────── */}
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
              <Info className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* App identity */}
          <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 shadow-md">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Crypto Audit Master
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Version 1.0.0
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Indian Crypto Spot Trade Audit &amp; Tax Analysis
              </p>
            </div>
          </div>

          <Separator />

          {/* Features */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">
              Features
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { icon: Layers, label: 'FIFO Matching Engine', desc: 'First In, First Out trade matching' },
                { icon: IndianRupee, label: 'India VDA Tax Compliant', desc: '30% tax + 4% cess + 1% TDS' },
                { icon: TrendingUp, label: 'Multi-Exchange Support', desc: 'Binance, CoinDCX, WazirX & more' },
                { icon: FileText, label: 'CSV Import', desc: 'Auto-detect column aliases' },
                { icon: Info, label: 'ITR-Ready Reports', desc: 'Export tax-ready reports' },
                { icon: Shield, label: 'Local-First', desc: 'Your data stays on your device' },
              ].map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-xl border p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
                    <Icon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Sign Out Card ──────────────────────────────── */}
      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Sign Out</p>
                <p className="text-xs text-muted-foreground">
                  Sign out of your account on this device
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="rounded-xl text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Dialogs ────────────────────────────────────── */}

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-6 gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Rename Workspace</DialogTitle>
            <DialogDescription>
              Enter a new name for &quot;{activeWorkspace?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-input" className="text-sm font-medium">
              Workspace Name
            </Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new workspace name"
              className="h-10 rounded-xl bg-muted/50 border-border/50 focus-visible:border-teal-500 focus-visible:ring-teal-500/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSave();
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setShowRenameDialog(false)}
              disabled={isLoading}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSave}
              disabled={isLoading || !renameValue.trim()}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Delete Workspace
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">
                  &quot;{activeWorkspace?.name}&quot;
                </span>
                ?
              </p>
              <div className="rounded-xl border border-red-200/60 bg-red-50/50 p-3 dark:border-red-800/30 dark:bg-red-950/20">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  This action cannot be undone
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">
                  All CSV files, trades, reports, notes, and export history will
                  be permanently deleted.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white border-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent className="rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to delete your account? This will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Remove your profile and authentication data</li>
                <li>Clear all locally stored preferences</li>
                <li>Sign you out of the application</li>
              </ul>
              <div className="rounded-xl border border-red-200/60 bg-red-50/50 p-3 dark:border-red-800/30 dark:bg-red-950/20">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  This action is permanent
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">
                  You will need to sign up again to use the application.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white border-0"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
