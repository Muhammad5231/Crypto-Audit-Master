'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  TrendingDown,
  Clock,
  BarChart3,
  IndianRupee,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { reportApi } from '@/lib/api';
import { formatINR, getValueColor } from '@/lib/utils/format';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';

interface PerformanceData {
  totalRealizedTrades: number;
  winningTrades: number;
  losingTrades: number;
  pairSummary: Array<{
    pair: string;
    realizedCount: number;
    grossProfit: string;
    finalNetProfit: string;
    winRate: string;
  }>;
  firstTradeDate: string | null;
  lastTradeDate: string | null;
  avgProfitPerTrade: string;
  totalFinalNetProfit: string;
}

function formatAvgHolding(firstDate: string | null, lastDate: string | null, totalTrades: number): string {
  if (!firstDate || !lastDate || totalTrades <= 0) return 'N/A';
  try {
    const first = new Date(firstDate);
    const last = new Date(lastDate);
    const diffMs = Math.abs(last.getTime() - first.getTime());
    const avgMs = diffMs / totalTrades;
    const avgDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
    if (avgDays < 1) return '< 1 day';
    if (avgDays < 30) return `${avgDays} day${avgDays !== 1 ? 's' : ''}`;
    const months = Math.floor(avgDays / 30);
    const remainingDays = avgDays % 30;
    if (remainingDays === 0) return `${months} month${months !== 1 ? 's' : ''}`;
    return `${months}m ${remainingDays}d`;
  } catch {
    return 'N/A';
  }
}

export function PerformanceSummary() {
  const { activeWorkspace } = useWorkspaceStore();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasReport, setHasReport] = useState(false);

  const workspaceId = activeWorkspace?.id || (activeWorkspace as any)?._id;

  const fetchAnalytics = useCallback(async () => {
    if (!workspaceId) {
      setData(null);
      setIsLoading(false);
      setHasReport(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await reportApi.getAnalytics(workspaceId);
      const analytics = result.analytics || result;
      setData(analytics);
      setHasReport(true);
    } catch {
      setData(null);
      setHasReport(false);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Derive best and worst performers from pairSummary
  const bestPair = data?.pairSummary && data.pairSummary.length > 0
    ? data.pairSummary.reduce(
        (best, p) => (parseFloat(p.finalNetProfit) > parseFloat(best.finalNetProfit) ? p : best),
        data.pairSummary[0]
      )
    : null;

  const worstPair = data?.pairSummary && data.pairSummary.length > 0
    ? data.pairSummary.reduce(
        (worst, p) => (parseFloat(p.finalNetProfit) < parseFloat(worst.finalNetProfit) ? p : worst),
        data.pairSummary[0]
      )
    : null;

  const avgHolding = data
    ? formatAvgHolding(data.firstTradeDate, data.lastTradeDate, data.totalRealizedTrades)
    : 'N/A';

  // No workspace selected
  if (!workspaceId && !isLoading) {
    return (
      <Card className="rounded-2xl border shadow-sm bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Select a workspace to see performance</p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No report yet
  if (!hasReport || !data) {
    return (
      <Card className="rounded-2xl border shadow-sm bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Process your trades to see performance summary
          </p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      icon: BarChart3,
      label: 'Total Trades',
      value: Number(data.totalRealizedTrades || 0).toLocaleString('en-IN'),
      sub: `${data.winningTrades}W / ${data.losingTrades}L`,
      iconBg: 'bg-teal-500/10',
      iconColor: 'text-teal-600 dark:text-teal-400',
    },
    {
      icon: Trophy,
      label: 'Best Performer',
      value: bestPair?.pair ?? 'N/A',
      sub: bestPair ? formatINR(bestPair.finalNetProfit) : '',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueClass: bestPair ? getValueColor(bestPair.finalNetProfit) : '',
    },
    {
      icon: TrendingDown,
      label: 'Worst Performer',
      value: worstPair?.pair ?? 'N/A',
      sub: worstPair ? formatINR(worstPair.finalNetProfit) : '',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      valueClass: worstPair ? getValueColor(worstPair.finalNetProfit) : '',
    },
    {
      icon: Clock,
      label: 'Avg Holding',
      value: avgHolding,
      sub: `across ${data.totalRealizedTrades} trades`,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="rounded-2xl border shadow-sm bg-gradient-to-br from-teal-500/5 via-card to-orange-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/20 to-orange-500/20">
              <IndianRupee className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, idx) => {
              const Icon = metric.icon;
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * idx }}
                  className="flex items-start gap-3 rounded-xl p-3 bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${metric.iconBg}`}>
                    <Icon className={`h-4 w-4 ${metric.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground leading-none mb-1.5">
                      {metric.label}
                    </p>
                    <p className={`text-sm font-bold truncate ${metric.valueClass || 'text-foreground'}`}>
                      {metric.value}
                    </p>
                    {metric.sub && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                        {metric.sub}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom summary bar */}
          {data.totalFinalNetProfit && (
            <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Net P&L across all pairs</span>
              <Badge
                className={`text-xs font-semibold px-2.5 py-0.5 ${
                  parseFloat(data.totalFinalNetProfit) >= 0
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20'
                }`}
              >
                {parseFloat(data.totalFinalNetProfit) >= 0 ? '↑' : '↓'}{' '}
                {formatINR(data.totalFinalNetProfit)}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
