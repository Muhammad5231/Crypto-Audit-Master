"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  BarChart3,
  Plus,
  Download,
  Clock,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { uploadApi, exportApi } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils/dateUtils";

interface ActivityItem {
  id: string;
  type: "upload" | "report" | "export";
  icon: LucideIcon;
  title: string;
  detail: string;
  timestamp: string;
}

const iconMap: Record<string, LucideIcon> = {
  upload: Upload,
  report: BarChart3,
  export: Download,
  workspace: Plus,
};

export function ActivityFeed() {
  const { activeWorkspace } = useWorkspaceStore();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const workspaceId = activeWorkspace?.id;

  const fetchActivity = useCallback(async () => {
    if (!workspaceId) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const allItems: ActivityItem[] = [];

      // Fetch uploads
      try {
        const uploadResult = await uploadApi.list(workspaceId);
        const uploads = uploadResult.uploads || [];
        for (const u of uploads.slice(0, 3)) {
          allItems.push({
            id: u.id,
            type: "upload",
            icon: Upload,
            title: `Uploaded ${u.filename}`,
            detail: `${u.parsedCount} trades parsed`,
            timestamp: u.uploadedAt,
          });
        }
      } catch {
        // ignore upload fetch errors
      }

      // Fetch export history
      try {
        const exportResult = await exportApi.getHistory(workspaceId);
        const history = exportResult.history || [];
        for (const h of history.slice(0, 2)) {
          allItems.push({
            id: h.id,
            type: "export",
            icon: Download,
            title: "Report exported",
            detail: `${h.filename}`,
            timestamp: h.generatedAt,
          });
        }
      } catch {
        // ignore export fetch errors
      }

      // Sort by timestamp (most recent first)
      allItems.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allItems.slice(0, 5));
    } catch {
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No recent activity
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Upload CSV files and generate reports to see activity here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: index * 0.07,
                    ease: "easeOut",
                  }}
                  className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/40"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      item.type === "upload"
                        ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                        : item.type === "export"
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">
                        {item.detail}
                      </p>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">
                        &mdash; {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
