'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Target,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { reportApi } from '@/lib/api';
import { formatINR } from '@/lib/utils/format';
import { formatDate } from '@/lib/utils/dateUtils';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';

interface TradeStats {
  totalRealizedTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalSellValue: string;
  avgProfitPerTrade: string;
  pairSummary: Array<{
    pair: string;
    realizedCount: number;
  }>;
  firstTradeDate: string | null;
  lastTradeDate: string | null;
}

export function TradeStatsCard() {
  const { activeWorkspace } = useWorkspaceStore();
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const workspaceId = activeWorkspace?.id;

  const fetchStats = useCallback(async () => {
    if (!workspaceId) {
      setStats(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await reportApi.getAnalytics(workspaceId);
      const data = result.analytics || result;
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const mostTradedPair =
    stats?.pairSummary && stats.pairSummary.length > 0
      ? stats.pairSummary.reduce(
          (best, p) => (p.realizedCount > best.realizedCount ? p : best),
          stats.pairSummary[0]
        )
      : null;

  const winPct =
    stats && stats.totalRealizedTrades > 0
      ? Math.round((stats.winningTrades / stats.totalRealizedTrades) * 100)
      : 0;

  const avgTradeSize =
    stats && stats.totalRealizedTrades > 0
      ? parseFloat(stats.totalSellValue) / stats.totalRealizedTrades
      : 0;

  if (isLoading) {
    return (
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalRealizedTrades === 0) {
    return null;
  }

  return (
    <Card className="rounded-2xl border shadow-sm bg-gradient-to-br from-teal-500/5 via-card to-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
            <BarChart3 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          Trade Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total Trades */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Total Trades</span>
            </div>
            <AnimatedCounter
              value={stats.totalRealizedTrades}
              prefix=""
              className="text-sm font-bold text-foreground"
            />
          </div>

          {/* Win / Loss Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2.5">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Profitable / Loss
              </span>
              <span className="text-sm font-semibold text-foreground">
                {stats.winningTrades} / {stats.losingTrades}
              </span>
            </div>
            {/* Mini bar visualization */}
            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-red-500/15">
              <div
                className="h-full bg-emerald-500 rounded-l-full transition-all duration-700"
                style={{ width: `${winPct}%` }}
              />
              <div
                className="h-full bg-red-400 rounded-r-full transition-all duration-700"
                style={{ width: `${100 - winPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{winPct}% win rate</span>
              <span>{100 - winPct}% loss rate</span>
            </div>
          </div>

          {/* Average Trade Size */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Avg Trade Size</span>
            <span className="text-sm font-semibold text-foreground">
              {formatINR(avgTradeSize.toFixed(2))}
            </span>
          </div>

          {/* Most Traded Pair */}
          {mostTradedPair && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Most Traded Pair</span>
              <span className="text-sm font-semibold text-foreground">
                {mostTradedPair.pair}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({mostTradedPair.realizedCount} trades)
                </span>
              </span>
            </div>
          )}

          {/* First & Last Trade Date */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2.5">
              <CalendarDays className="h-4 w-4" />
              Trade Period
            </span>
            <span className="text-sm font-semibold text-foreground">
              {stats.firstTradeDate
                ? `${formatDate(stats.firstTradeDate)} – ${stats.lastTradeDate ? formatDate(stats.lastTradeDate) : 'N/A'}`
                : 'N/A'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
