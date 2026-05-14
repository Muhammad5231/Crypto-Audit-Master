'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  History,
  FileSpreadsheet,
  Download,
  Clock,
  Loader2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { exportApi } from '@/lib/api';
import { formatDateTime, formatRelativeTime } from '@/lib/utils/dateUtils';

interface ExportRecord {
  id: string;
  exportType: string;
  filename: string;
  generatedAt: string;
}

export function ExportHistoryView() {
  const { activeWorkspace } = useWorkspaceStore();
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const workspaceId = activeWorkspace?.id;

  const fetchHistory = useCallback(async () => {
    if (!workspaceId) {
      setHistory([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await exportApi.getHistory(workspaceId);
      setHistory(result.history || []);
    } catch {
      toast.error('Failed to load export history');
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredHistory = history.filter((record) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      record.filename.toLowerCase().includes(q) ||
      record.exportType.toLowerCase().includes(q) ||
      formatDateTime(record.generatedAt).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Export History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View all your past export records for{' '}
            {activeWorkspace ? (
              <span className="font-medium text-foreground">
                {activeWorkspace.name}
              </span>
            ) : (
              'this workspace'
            )}
            .
          </p>
        </div>
        {history.length > 0 && (
          <Badge variant="secondary" className="font-normal self-start">
            {history.length} export{history.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Search */}
      {history.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-xl bg-muted/50 border-border/50"
          />
        </div>
      )}

      {/* Content */}
      <Card className="rounded-2xl border shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
              <History className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            All Exports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl border"
                >
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No Exports Yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-[320px]">
                When you export reports from the Export page, they will appear
                here for your records.
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No exports matching &quot;{searchQuery}&quot;
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs rounded-lg"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px] overflow-y-auto">
              <div className="space-y-2 pr-2">
                {filteredHistory.map((record) => (
                  <div
                    key={record.id}
                    className="group flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/50"
                  >
                    {/* File icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {record.filename}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatRelativeTime(record.generatedAt)}</span>
                        <span className="text-muted-foreground/40">|</span>
                        <span>{formatDateTime(record.generatedAt)}</span>
                      </div>
                    </div>

                    {/* Type badge */}
                    <Badge
                      variant="outline"
                      className="text-xs font-normal uppercase shrink-0 hidden sm:flex"
                    >
                      {record.exportType}
                    </Badge>

                    {/* Download icon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground group-hover:text-teal-600 group-hover:bg-teal-500/10 transition-colors">
                      <Download className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
