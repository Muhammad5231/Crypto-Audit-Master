'use client'

import { useCallback, useEffect, useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { workspaceApi } from '@/lib/api'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils/dateUtils'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { motion } from 'framer-motion'
import {
  Plus,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Archive,
  ArchiveRestore,
  Check,
  FileText,
  ArrowRightLeft,
  StickyNote,
  Settings,
  Loader2,
  LayoutGrid,
  Search,
} from 'lucide-react'

const presetColors = [
  { name: 'Teal', value: '#0d9488' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Yellow', value: '#eab308' },
]

const financialYears = [
  '2022-2023',
  '2023-2024',
  '2024-2025',
  '2025-2026',
]

interface WorkspaceFormData {
  name: string
  description: string
  color: string
  financialYear: string
}

const emptyForm: WorkspaceFormData = {
  name: '',
  description: '',
  color: '#0d9488',
  financialYear: '2024-2025',
}

export function WorkspacesView() {
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
  } = useWorkspaceStore()

  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null)
  const [deletingWorkspace, setDeletingWorkspace] = useState<any>(null)

  // Form state
  const [formData, setFormData] = useState<WorkspaceFormData>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch workspaces
  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await workspaceApi.list(showArchived)
      const wsList = Array.isArray(data?.workspaces) ? data.workspaces : []
      setWorkspaces(wsList)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load workspaces')
    } finally {
      setIsLoading(false)
    }
  }, [showArchived])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces)

  // Filter workspaces
  const filteredWorkspaces = (workspaces ?? []).filter((ws) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        ws.name.toLowerCase().includes(q) ||
        (ws.description || '').toLowerCase().includes(q) ||
        ws.financialYear.toLowerCase().includes(q)
      )
    }
    return true
  })

  const activeWorkspaces = filteredWorkspaces.filter((ws) => !ws.isArchived)
  const archivedWorkspaces = filteredWorkspaces.filter((ws) => ws.isArchived)

  // ─── Create ─────────────────────────────────────
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a workspace name')
      return
    }
    setIsSubmitting(true)
    try {
      const data = await workspaceApi.create({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        financialYear: formData.financialYear,
      })
      addWorkspace(data.workspace)
      setActiveWorkspace(data.workspace)
      toast.success('Workspace created!', {
        description: `"${data.workspace.name}" is ready to use.`,
      })
      setCreateOpen(false)
      setFormData(emptyForm)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create workspace')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Edit ───────────────────────────────────────
  const openEditDialog = (ws: any) => {
    setEditingWorkspace(ws)
    setFormData({
      name: ws.name,
      description: ws.description || '',
      color: ws.color || '#0d9488',
      financialYear: ws.financialYear || '2024-2025',
    })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editingWorkspace || !formData.name.trim()) return
    setIsSubmitting(true)
    try {
      const data = await workspaceApi.update(editingWorkspace.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        color: formData.color,
        financialYear: formData.financialYear,
      })
      updateWorkspace(editingWorkspace.id, data.workspace)
      toast.success('Workspace updated')
      setEditOpen(false)
      setEditingWorkspace(null)
      setFormData(emptyForm)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update workspace')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Delete ─────────────────────────────────────
  const openDeleteDialog = (ws: any) => {
    setDeletingWorkspace(ws)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingWorkspace) return
    setIsSubmitting(true)
    try {
      await workspaceApi.delete(deletingWorkspace.id)
      removeWorkspace(deletingWorkspace.id)
      toast.success('Workspace deleted')
      setDeleteOpen(false)
      setDeletingWorkspace(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete workspace')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Archive ────────────────────────────────────
  const handleArchive = async (ws: any, isArchived: boolean) => {
    try {
      await workspaceApi.archive(ws.id, isArchived)
      updateWorkspace(ws.id, { isArchived })
      toast.success(isArchived ? 'Workspace archived' : 'Workspace restored')
      // Refresh list
      const data = await workspaceApi.list(showArchived)
      const wsList = Array.isArray(data?.workspaces) ? data.workspaces : []
      setWorkspaces(wsList)
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive workspace')
    }
  }

  // ─── Duplicate ──────────────────────────────────
  const handleDuplicate = async (ws: any) => {
    try {
      const data = await workspaceApi.duplicate(ws.id)
      addWorkspace(data.workspace)
      toast.success('Workspace duplicated', {
        description: `"${data.workspace.name}" created.`,
      })
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate workspace')
    }
  }

  // ─── Switch ─────────────────────────────────────
  const handleSwitch = async (ws: any) => {
    setActiveWorkspace(ws)
    try {
      await workspaceApi.updateLastOpened(ws.id)
    } catch {
      // Non-blocking
    }
    toast.success(`Switched to "${ws.name}"`)
  }

  // ─── Loading ────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  const iconMap: Record<string, string> = {
    briefcase: '💼',
    user: '👤',
    building: '🏢',
    chart: '📊',
    wallet: '👛',
    bitcoin: '₿',
    rocket: '🚀',
    star: '⭐',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Workspaces</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your audit workspaces and switch between them
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5 h-8"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? (
              <ArchiveRestore className="h-3.5 w-3.5" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
          <Button
            onClick={() => {
              setFormData(emptyForm)
              setCreateOpen(true)
            }}
            className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            New Workspace
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workspaces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 rounded-xl bg-muted/50 border-border/50"
        />
      </div>

      {/* Workspace Grid */}
      {filteredWorkspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <motion.div
            animate={{ y: [0, -8, 0], scale: [1, 1.02, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="flex size-20 items-center justify-center rounded-3xl bg-muted/30 backdrop-blur-sm border border-border/30">
              <LayoutGrid className="size-10 text-muted-foreground" />
            </div>
          </motion.div>
          <h3 className="mt-6 text-lg font-semibold text-foreground">No Workspaces</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {searchQuery
              ? 'No workspaces match your search query.'
              : 'Create your first workspace to start auditing your crypto trades.'}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="mt-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Workspace
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Active Workspaces */}
          {activeWorkspaces.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Active Workspaces ({activeWorkspaces.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeWorkspaces.map((ws, idx) => (
                  <WorkspaceCard
                    key={ws.id}
                    workspace={ws}
                    isActive={activeWorkspace?.id === ws.id}
                    iconMap={iconMap}
                    onSwitch={() => handleSwitch(ws)}
                    onEdit={() => openEditDialog(ws)}
                    onDuplicate={() => handleDuplicate(ws)}
                    onArchive={() => handleArchive(ws, true)}
                    onDelete={() => openDeleteDialog(ws)}
                    index={idx}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Archived Workspaces */}
          {showArchived && archivedWorkspaces.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-8">
                Archived Workspaces ({archivedWorkspaces.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {archivedWorkspaces.map((ws, idx) => (
                  <WorkspaceCard
                    key={ws.id}
                    workspace={ws}
                    isActive={false}
                    iconMap={iconMap}
                    onSwitch={() => handleSwitch(ws)}
                    onEdit={() => openEditDialog(ws)}
                    onDuplicate={() => handleDuplicate(ws)}
                    onArchive={() => handleArchive(ws, false)}
                    onDelete={() => openDeleteDialog(ws)}
                    index={idx}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Create Dialog ────────────────────────────── */}
      <WorkspaceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        title="Create New Workspace"
        description="Set up a workspace to organize your crypto audit data for a specific financial year."
        submitLabel="Create Workspace"
      />

      {/* ─── Edit Dialog ──────────────────────────────── */}
      <WorkspaceFormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            setEditingWorkspace(null)
            setFormData(emptyForm)
          }
        }}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleEdit}
        isSubmitting={isSubmitting}
        title="Edit Workspace"
        description="Update your workspace settings."
        submitLabel="Save Changes"
      />

      {/* ─── Delete Confirmation ─────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingWorkspace?.name}&quot;? This action
              cannot be undone. All associated trades, reports, and notes will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Workspace Card Component ──────────────────────────

function WorkspaceCard({
  workspace,
  isActive,
  iconMap,
  onSwitch,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  index,
}: {
  workspace: any
  isActive: boolean
  iconMap: Record<string, string>
  onSwitch: () => void
  onEdit: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
  index: number
}) {
  const counts = workspace._count || {}

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/5 hover:scale-[1.01] group',
          isActive && 'ring-2 ring-teal-500/50 shadow-md shadow-teal-500/10',
          workspace.isArchived && 'opacity-70'
        )}
      >
        {/* Color accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: workspace.color || '#0d9488' }}
        />

        <CardContent className="p-5 pt-6">
          {/* Header: icon + name + active badge + menu */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: `${workspace.color || '#0d9488'}15` }}
              >
                {iconMap[workspace.icon] || iconMap.briefcase}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {workspace.name}
                  </h3>
                  {isActive && (
                    <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-400 text-[10px] px-1.5 py-0 h-4">
                      Active
                    </Badge>
                  )}
                  {workspace.isArchived && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      Archived
                    </Badge>
                  )}
                </div>
                {workspace.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {workspace.description}
                  </p>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                {!isActive && (
                  <DropdownMenuItem
                    onClick={onSwitch}
                    className="rounded-lg cursor-pointer"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Switch to
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={onEdit}
                  className="rounded-lg cursor-pointer"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDuplicate}
                  className="rounded-lg cursor-pointer"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {workspace.isArchived ? (
                  <DropdownMenuItem
                    onClick={onArchive}
                    className="rounded-lg cursor-pointer"
                  >
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={onArchive}
                    className="rounded-lg cursor-pointer"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="rounded-lg cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Financial Year */}
          <div className="mt-3">
            <Badge variant="outline" className="text-[11px] font-mono">
              FY {workspace.financialYear || 'N/A'}
            </Badge>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <StatItem icon={<FileText className="h-3 w-3" />} value={counts.csvFiles || 0} label="Files" />
            <StatItem icon={<ArrowRightLeft className="h-3 w-3" />} value={counts.trades || 0} label="Trades" />
            <StatItem icon={<StickyNote className="h-3 w-3" />} value={counts.notes || 0} label="Notes" />
            <StatItem icon={<Settings className="h-3 w-3" />} value={counts.exchangeSettings || 0} label="Exchanges" />
          </div>

          {/* Footer: Last opened + Switch button */}
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {workspace.lastOpenedAt
                ? `Last opened ${formatRelativeTime(workspace.lastOpenedAt)}`
                : `Created ${formatRelativeTime(workspace.createdAt)}`}
            </span>
            {!isActive && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-xs h-7 px-2.5"
                onClick={onSwitch}
              >
                Switch
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center text-muted-foreground mb-0.5">{icon}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}

// ─── Workspace Form Dialog ─────────────────────────────

function WorkspaceFormDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  title,
  description,
  submitLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: WorkspaceFormData
  setFormData: (data: WorkspaceFormData) => void
  onSubmit: () => void
  isSubmitting: boolean
  title: string
  description: string
  submitLabel: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl p-6 gap-5">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="ws-form-name" className="text-sm font-medium">
              Workspace Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ws-form-name"
              placeholder="e.g., My Crypto Portfolio"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-10 rounded-xl bg-muted/50 border-border/50 focus-visible:border-teal-500 focus-visible:ring-teal-500/20"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="ws-form-desc" className="text-sm font-medium">
              Description
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            </Label>
            <Textarea
              id="ws-form-desc"
              placeholder="Brief description of this workspace..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[72px] rounded-xl bg-muted/50 border-border/50 focus-visible:border-teal-500 focus-visible:ring-teal-500/20 resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c.value })}
                  className={cn(
                    'h-8 w-8 rounded-xl transition-all duration-200 flex items-center justify-center',
                    formData.color === c.value
                      ? 'ring-2 ring-offset-2 ring-offset-background scale-110'
                      : 'hover:scale-110'
                  )}
                  style={{
                    backgroundColor: c.value,
                    ...(formData.color === c.value ? { ringColor: c.value } : {}),
                  }}
                  title={c.name}
                >
                  {formData.color === c.value && (
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

          {/* Financial Year */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Financial Year</Label>
            <Select
              value={formData.financialYear}
              onValueChange={(v) => setFormData({ ...formData, financialYear: v })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50">
                <SelectValue placeholder="Select financial year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {financialYears.map((fy) => (
                  <SelectItem key={fy} value={fy} className="rounded-lg">
                    FY {fy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !formData.name.trim()}
            className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
