'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  FileText,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { notesApi } from '@/lib/api';
import { formatRelativeTime, formatDateTime } from '@/lib/utils/dateUtils';

// ── Types ──────────────────────────────────────────────────────────────
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ── Main Component ──────────────────────────────────────────────────────
export function NotesView() {
  const { activeWorkspace } = useWorkspaceStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  const workspaceId = activeWorkspace?.id;

  // ── Fetch Notes ─────────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    if (!workspaceId) {
      setNotes([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await notesApi.list(workspaceId);
      setNotes(result.notes || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load notes';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // ── Filtered Notes ──────────────────────────────────────────────────
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  // ── Open Add Dialog ─────────────────────────────────────────────────
  const openAddDialog = () => {
    setFormTitle('');
    setFormContent('');
    setEditingNote(null);
    setShowDialog(true);
  };

  // ── Open Edit Dialog ────────────────────────────────────────────────
  const openEditDialog = (note: Note) => {
    setFormTitle(note.title);
    setFormContent(note.content);
    setEditingNote(note);
    setShowDialog(true);
  };

  // ── Save (Add or Edit) ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingNote) {
        await notesApi.update(workspaceId!, editingNote.id, {
          title: formTitle.trim(),
          content: formContent.trim(),
        });
        toast.success('Note updated');
      } else {
        await notesApi.create(workspaceId!, {
          title: formTitle.trim(),
          content: formContent.trim(),
        });
        toast.success('Note created');
      }
      setShowDialog(false);
      fetchNotes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save note';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget || !workspaceId) return;

    setIsDeleting(true);
    try {
      await notesApi.delete(workspaceId, deleteTarget.id);
      toast.success('Note deleted');
      setDeleteTarget(null);
      fetchNotes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Content Preview ─────────────────────────────────────────────────
  const getContentPreview = (content: string, maxLen = 120) => {
    if (!content) return 'No content';
    const clean = content.replace(/\n+/g, ' ').trim();
    return clean.length > maxLen ? clean.slice(0, maxLen) + '…' : clean;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeWorkspace
              ? `${activeWorkspace.name} — Workspace journal`
              : 'Select a workspace to view notes'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotes}
            disabled={isLoading}
            className="rounded-xl text-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={openAddDialog}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                    <StickyNote className="h-4 w-4 text-teal-600" />
                  </div>
                  {editingNote ? 'Edit Note' : 'New Note'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="noteTitle" className="text-sm font-medium">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="noteTitle"
                    placeholder="Enter note title..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="rounded-xl"
                    autoFocus
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="noteContent" className="text-sm font-medium">
                    Content
                  </Label>
                  <Textarea
                    id="noteContent"
                    placeholder="Write your note here... (plain text)"
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="rounded-xl min-h-[160px] resize-y"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDialog(false)}
                    className="rounded-xl text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !formTitle.trim()}
                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm"
                  >
                    {isSaving
                      ? 'Saving...'
                      : editingNote
                        ? 'Update Note'
                        : 'Create Note'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      {!isLoading && notes.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-lg"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Search results indicator */}
      {searchQuery && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span>
            {filteredNotes.length} result{filteredNotes.length !== 1 ? 's' : ''} found
          </span>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <Card className="rounded-2xl border border-red-200 bg-red-50/50 dark:border-red-800/30 dark:bg-red-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load notes</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Notes List */}
      {!isLoading && !error && (
        <>
          {notes.length === 0 ? (
            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500/10 to-orange-500/10 mb-6">
                  <StickyNote className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Notes Yet</h3>
                <p className="text-sm text-muted-foreground max-w-[360px] mb-6">
                  Create notes to track your observations, strategies, and important details about your crypto trades.
                </p>
                <Button
                  onClick={openAddDialog}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create First Note
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Notes count */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <StickyNote className="h-3.5 w-3.5" />
                <span>{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Notes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredNotes.map((note) => {
                  const isUpdated = note.updatedAt !== note.createdAt;
                  return (
                    <Card
                      key={note.id}
                      className="group rounded-2xl border shadow-sm transition-all hover:shadow-md hover:border-teal-500/20"
                    >
                      <CardContent className="p-4">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 mt-0.5">
                              <FileText className="h-4 w-4 text-teal-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                                {note.title}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(note)}
                              className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(note)}
                              className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Content Preview */}
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 ml-[2.875rem]">
                          {getContentPreview(note.content)}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center gap-3 mt-3 ml-[2.875rem]">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span title={formatDateTime(note.createdAt)}>
                              {formatRelativeTime(note.createdAt)}
                            </span>
                          </div>
                          {isUpdated && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] font-normal px-1.5 py-0 h-4 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                            >
                              edited
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Empty search results */}
              {searchQuery && filteredNotes.length === 0 && (
                <Card className="rounded-2xl border shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-8 w-8 text-muted-foreground/60 mb-3" />
                    <h3 className="text-sm font-semibold text-foreground mb-1">No matching notes</h3>
                    <p className="text-xs text-muted-foreground">
                      Try a different search term or{' '}
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-teal-600 hover:underline"
                      >
                        clear search
                      </button>
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Delete Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">&quot;{deleteTarget?.title}&quot;</span>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl text-sm"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl text-sm"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
