'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingCart,
  Receipt,
  BadgePercent,
  Landmark,
  Calculator,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  RefreshCw,
  AlertCircle,
  Upload,
  Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAppStore } from '@/store/appStore';
import { reportApi } from '@/lib/api';
import { formatINR, formatCompact, getValueColor } from '@/lib/utils/format';
import { formatRelativeTime } from '@/lib/utils/dateUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────
interface AnalyticsData {
  totalRealizedTrades: number;
  totalOpenHoldings: number;
  totalBuyValue: string;
  totalSellValue: string;
  totalGrossProfit: string;
  totalFees: string;
  totalGstOnFees: string;
  totalTds: string;
  totalBaseTax: string;
  totalCess: string;
  totalDirectTax: string;
  totalNetProfit: string;
  totalFinalNetProfit: string;
  generatedAt: string;
  winningTrades: number;
  losingTrades: number;
  winRate: string;
  avgProfitPerTrade: string;
  largestProfit: string;
  largestLoss: string;
  totalInvestedInHoldings: string;
  pairSummary: Array<{
    pair: string;
    realizedCount: number;
    grossProfit: string;
    netProfit: string;
    finalNetProfit: string;
    totalFees: string;
    winRate: string;
  }>;
  monthlyProfit?: Array<{ month: string; profit: string; trades: number }>;
}

// ── Color Palette ──────────────────────────────────────────────────────
const TEAL_COLORS = [
  '#0d9488',
  '#14b8a6',
  '#2dd4bf',
  '#5eead4',
  '#99f6e4',
  '#0f766e',
  '#115e59',
  '#134e4a',
];
const TAX_COLORS = ['#0d9488', '#f97316', '#06b6d4', '#ef4444'];
const WL_COLORS = ['#10b981', '#ef4444'];

function safeNumber(value: any): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function normalizeAnalytics(input: any): AnalyticsData {
  const summary = input?.summary || {};
  const realizedTrades = Array.isArray(input?.realizedTrades)
    ? input.realizedTrades
    : [];

  const openHoldings = Array.isArray(input?.openHoldings)
    ? input.openHoldings
    : [];

  const winningTrades = realizedTrades.filter(
    (trade: any) => safeNumber(trade.finalNetProfit ?? trade.grossProfit) > 0
  ).length;

  const losingTrades = realizedTrades.filter(
    (trade: any) => safeNumber(trade.finalNetProfit ?? trade.grossProfit) < 0
  ).length;

  const pairMap: Record<string, any> = {};
  const monthMap: Record<string, any> = {};

  realizedTrades.forEach((trade: any) => {
    const pair = String(trade.pair || "UNKNOWN").toUpperCase();

    if (!pairMap[pair]) {
      pairMap[pair] = {
        pair,
        realizedCount: 0,
        grossProfit: 0,
        netProfit: 0,
        finalNetProfit: 0,
        totalFees: 0,
        wins: 0,
      };
    }

    const gross = safeNumber(trade.grossProfit);
    const net = safeNumber(trade.netProfitInHand);
    const finalNet = safeNumber(trade.finalNetProfit);
    const fees = safeNumber(trade.totalFees);

    pairMap[pair].realizedCount += 1;
    pairMap[pair].grossProfit += gross;
    pairMap[pair].netProfit += net;
    pairMap[pair].finalNetProfit += finalNet;
    pairMap[pair].totalFees += fees;

    if (finalNet > 0) pairMap[pair].wins += 1;

    const dateValue = trade.sellDate || trade.buyDate || trade.createdAt;
    const date = dateValue ? new Date(dateValue) : null;

    if (date && !Number.isNaN(date.getTime())) {
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;

      if (!monthMap[month]) {
        monthMap[month] = {
          month,
          profit: 0,
          trades: 0,
        };
      }

      monthMap[month].profit += finalNet;
      monthMap[month].trades += 1;
    }
  });

  const pairSummary = Object.values(pairMap).map((pair: any) => ({
    pair: pair.pair,
    realizedCount: pair.realizedCount,
    grossProfit: String(pair.grossProfit),
    netProfit: String(pair.netProfit),
    finalNetProfit: String(pair.finalNetProfit),
    totalFees: String(pair.totalFees),
    winRate:
      pair.realizedCount > 0
        ? ((pair.wins / pair.realizedCount) * 100).toFixed(2)
        : "0",
  }));

  const finalProfits = realizedTrades.map((trade: any) =>
    safeNumber(trade.finalNetProfit)
  );

  const totalRealizedTrades = realizedTrades.length;

  return {
    totalRealizedTrades,
    totalOpenHoldings: openHoldings.length,

    totalBuyValue: String(summary.buyValue ?? summary.totalBuyValue ?? 0),
    totalSellValue: String(summary.sellValue ?? summary.totalSellValue ?? 0),
    totalGrossProfit: String(
      summary.grossProfit ?? summary.totalGrossProfit ?? 0
    ),
    totalFees: String(summary.totalFees ?? 0),
    totalGstOnFees: String(
      summary.gstOnFees ?? summary.totalGstOnFees ?? 0
    ),
    totalTds: String(summary.tds ?? summary.totalTds ?? 0),
    totalBaseTax: String(
      summary.baseCryptoTax ?? summary.totalBaseTax ?? 0
    ),
    totalCess: String(summary.cess ?? summary.totalCess ?? 0),
    totalDirectTax: String(summary.totalDirectTax ?? 0),
    totalNetProfit: String(
      summary.netProfitInHand ?? summary.totalNetProfit ?? 0
    ),
    totalFinalNetProfit: String(
      summary.finalNetProfit ?? summary.totalFinalNetProfit ?? 0
    ),

    generatedAt: input?.generatedAt || new Date().toISOString(),

    winningTrades,
    losingTrades,
    winRate:
      totalRealizedTrades > 0
        ? ((winningTrades / totalRealizedTrades) * 100).toFixed(2)
        : "0",

    avgProfitPerTrade:
      totalRealizedTrades > 0
        ? String(
          safeNumber(summary.finalNetProfit) / totalRealizedTrades
        )
        : "0",

    largestProfit: String(finalProfits.length ? Math.max(...finalProfits) : 0),
    largestLoss: String(finalProfits.length ? Math.min(...finalProfits) : 0),

    totalInvestedInHoldings: String(
      openHoldings.reduce(
        (sum: number, holding: any) =>
          sum + safeNumber(holding.investedValue),
        0
      )
    ),

    pairSummary,

    monthlyProfit: Object.values(monthMap).map((m: any) => ({
      month: m.month,
      profit: String(m.profit),
      trades: m.trades,
    })),
  };
}

// ── Custom Tooltip ──────────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
  valuePrefix = '',
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  valuePrefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-popover/95 backdrop-blur border shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {valuePrefix}
            {Number(entry.value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Skeletons ──────────────────────────────────────────────────────────
function MetricCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card/80 backdrop-blur border shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export function AnalyticsView() {
  const { activeWorkspace } = useWorkspaceStore();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = activeWorkspace?.id || (activeWorkspace as any)?._id;

  const fetchAnalytics = useCallback(async () => {
    if (!workspaceId) {
      setAnalytics(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await reportApi.getAnalytics(workspaceId);
      setAnalytics(normalizeAnalytics(result.analytics || result));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics';
      if (message.includes('404') || message.toLowerCase().includes('no completed report')) {
        setAnalytics(null);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const hasData = analytics !== null;

  // ── Chart Data Preparations ───────────────────────────────────────────
  const pairChartData = (analytics?.pairSummary || [])
    .slice(0, 10)
    .map((p) => ({
      name: p.pair.length > 12 ? p.pair.slice(0, 12) + '…' : p.pair,
      fullName: p.pair,
      profit: parseFloat(p.grossProfit),
    }))
    .sort((a, b) => b.profit - a.profit);

  const taxBreakdownData = hasData
    ? [
      { name: 'Base Tax (30%)', value: Math.abs(parseFloat(analytics.totalBaseTax || '0')) },
      { name: 'Cess (4%)', value: Math.abs(parseFloat(analytics.totalCess || '0')) },
      { name: 'GST on Fees', value: Math.abs(parseFloat(analytics.totalGstOnFees || '0')) },
      { name: 'TDS', value: Math.abs(parseFloat(analytics.totalTds || '0')) },
    ].filter((d) => d.value > 0)
    : [];

  const monthlyData = (analytics?.monthlyProfit || []).map((m) => ({
    month: m.month,
    profit: parseFloat(m.profit),
    trades: m.trades,
  }));

  const winLossData = hasData
    ? [
      { name: 'Profitable', value: analytics.winningTrades, color: WL_COLORS[0] },
      { name: 'Loss', value: analytics.losingTrades, color: WL_COLORS[1] },
    ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeWorkspace
              ? `${activeWorkspace.name} — ${activeWorkspace.financialYear || 'All Time'}`
              : 'Select a workspace to view analytics'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="rounded-xl text-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Report Generated Info */}
      {hasData && analytics.generatedAt && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Report generated {formatRelativeTime(analytics.generatedAt)}</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasData && !error && (
        <Card className="rounded-2xl bg-muted/30 backdrop-blur-sm border border-border/30 shadow-sm overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center relative">
            <div className="absolute inset-0 bg-gradient-radial from-teal-500/5 via-transparent to-orange-500/5 pointer-events-none" />
            <motion.div
              className="relative"
              animate={{ y: [0, -6, 0], rotate: [0, 2, -2, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500/10 to-orange-500/10">
                <BarChart3 className="h-10 w-10 text-muted-foreground" />
              </div>
            </motion.div>
            <h3 className="text-lg font-semibold text-foreground mb-2 relative">No Analytics Data</h3>
            <p className="text-sm text-muted-foreground max-w-[360px] mb-6 relative leading-relaxed">
              Upload CSV files and process trades to see your visual analytics,
              profit charts, and detailed tax breakdowns.
            </p>
            <div className="flex items-center gap-3 relative">
              <Button
                variant="outline"
                onClick={() => useAppStore.getState().setCurrentView('upload')}
                className="rounded-xl"
              >
                <Upload className="h-4 w-4 mr-1.5" />
                Upload CSV
              </Button>
              <Button
                onClick={() => useAppStore.getState().setCurrentView('upload')}
                className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Play className="h-4 w-4 mr-1.5" />
                Process Trades
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <Card className="rounded-2xl border border-red-200 bg-red-50/50 dark:border-red-800/30 dark:bg-red-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load analytics</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchAnalytics} className="mt-3 text-xs">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </>
      )}

      {/* ── Data Views ─────────────────────────────────────────────────── */}
      {hasData && analytics && (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-card/80 backdrop-blur border shadow-sm p-4 transition-all hover:shadow-md hover:scale-[1.02]">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                    Realized Trades
                  </p>
                  <p className="text-xl sm:text-2xl font-bold truncate bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent">
                    {safeNumber(analytics.totalRealizedTrades).toLocaleString('en-IN')}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {analytics.winRate && (
                      <Badge variant="secondary" className="text-[10px] font-normal bg-teal-500/10 text-teal-700 dark:text-teal-400">
                        {analytics.winRate}% win
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10">
                  <BarChart3 className="h-5 w-5 text-teal-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-card/80 backdrop-blur border shadow-sm p-4 transition-all hover:shadow-md hover:scale-[1.02]">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                    Gross Profit
                  </p>
                  <p className={`text-xl sm:text-2xl font-bold truncate bg-clip-text text-transparent bg-gradient-to-r ${parseFloat(analytics.totalGrossProfit) >= 0 ? 'from-emerald-600 to-emerald-400' : 'from-red-600 to-red-400'}`}>
                    {formatINR(analytics.totalGrossProfit)}
                  </p>
                  <div className="flex items-center gap-1 text-xs">
                    {parseFloat(analytics.totalGrossProfit) >= 0 ? (
                      <span className="text-emerald-600 flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" />
                        {parseFloat(analytics.totalGrossProfit) > 0 ? 'Profit' : 'Break Even'}
                      </span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-0.5">
                        <ArrowDownRight className="h-3 w-3" />
                        Loss
                      </span>
                    )}
                  </div>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${parseFloat(analytics.totalGrossProfit) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  <TrendingUp className={`h-5 w-5 ${parseFloat(analytics.totalGrossProfit) >= 0 ? 'text-emerald-600' : 'text-red-500'}`} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-card/80 backdrop-blur border shadow-sm p-4 transition-all hover:shadow-md hover:scale-[1.02]">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                    Net Profit
                  </p>
                  <p className={`text-xl sm:text-2xl font-bold truncate bg-clip-text text-transparent bg-gradient-to-r ${parseFloat(analytics.totalFinalNetProfit) >= 0 ? 'from-emerald-600 to-emerald-400' : 'from-red-600 to-red-400'}`}>
                    {formatINR(analytics.totalFinalNetProfit)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    After tax &amp; TDS
                  </div>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${parseFloat(analytics.totalFinalNetProfit) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  <Wallet className={`h-5 w-5 ${parseFloat(analytics.totalFinalNetProfit) >= 0 ? 'text-emerald-600' : 'text-red-500'}`} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-card/80 backdrop-blur border shadow-sm p-4 transition-all hover:shadow-md hover:scale-[1.02]">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                    Win / Loss
                  </p>
                  <p className="text-xl sm:text-2xl font-bold truncate bg-gradient-to-r from-orange-500 to-orange-300 bg-clip-text text-transparent">
                    {analytics.winningTrades} / {analytics.losingTrades}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    Avg {formatINR(analytics.avgProfitPerTrade)}/trade
                  </div>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                  <Trophy className="h-5 w-5 text-orange-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <MiniMetric icon={ShoppingCart} label="Buy Value" value={formatINR(analytics.totalBuyValue)} />
            <MiniMetric icon={Wallet} label="Sell Value" value={formatINR(analytics.totalSellValue)} />
            <MiniMetric icon={Receipt} label="Fees" value={formatINR(analytics.totalFees)} negative />
            <MiniMetric icon={BadgePercent} label="GST on Fees" value={formatINR(analytics.totalGstOnFees)} negative />
            <MiniMetric icon={Landmark} label="TDS" value={formatINR(analytics.totalTds)} negative />
            <MiniMetric
              icon={Package}
              label="Holdings"
              value={String(analytics.totalOpenHoldings || 0)}
            />
          </div>

          {/* ── Charts Grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit by Pair – Horizontal Bar */}
            {pairChartData.length > 0 ? (
              <Card className="rounded-2xl border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                      <TrendingUp className="h-4 w-4 text-teal-600" />
                    </div>
                    Profit by Pair
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={pairChartData}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                    >
                      <XAxis type="number" tickFormatter={(v) => formatCompact(v)} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        fontSize={11}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                      />
                      <Tooltip
                        content={<ChartTooltip valuePrefix="₹" />}
                        formatter={(value: number) => [formatINR(value), 'Gross Profit']}
                      />
                      <Bar dataKey="profit" radius={[0, 6, 6, 0]} maxBarSize={24}>
                        {pairChartData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.profit >= 0 ? TEAL_COLORS[index % TEAL_COLORS.length] : '#ef4444'}
                            fillOpacity={entry.profit >= 0 ? 0.85 : 0.7}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <ChartSkeleton />
            )}

            {/* Tax Breakdown – Donut */}
            {taxBreakdownData.length > 0 ? (
              <Card className="rounded-2xl border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Receipt className="h-4 w-4 text-orange-500" />
                    </div>
                    Tax Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="60%" height={300}>
                      <PieChart>
                        <Pie
                          data={taxBreakdownData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {taxBreakdownData.map((_, index) => (
                            <Cell key={index} fill={TAX_COLORS[index % TAX_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip valuePrefix="₹" />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-3 min-w-0">
                      {taxBreakdownData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2 text-sm">
                          <span
                            className="h-3 w-3 rounded-sm shrink-0"
                            style={{ backgroundColor: TAX_COLORS[index % TAX_COLORS.length] }}
                          />
                          <span className="text-muted-foreground truncate">{entry.name}</span>
                          <span className="ml-auto font-medium text-foreground whitespace-nowrap">
                            {formatINR(entry.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ChartSkeleton />
            )}

            {/* Monthly Realized Profit – Area */}
            {monthlyData.length > 0 ? (
              <Card className="rounded-2xl border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
                      <TrendingDown className="h-4 w-4 text-cyan-600" />
                    </div>
                    Monthly Realized Profit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.02} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.25} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis
                        dataKey="month"
                        fontSize={11}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        angle={-30}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        tickFormatter={(v) => formatCompact(v)}
                        fontSize={11}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip content={<ChartTooltip valuePrefix="₹" />} />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="#0d9488"
                        strokeWidth={2}
                        fill="url(#profitGradient)"
                        dot={{ r: 3, fill: '#0d9488' }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <ChartSkeleton />
            )}

            {/* Win / Loss Ratio – Pie */}
            {winLossData.length > 0 ? (
              <Card className="rounded-2xl border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Trophy className="h-4 w-4 text-emerald-600" />
                    </div>
                    Win / Loss Ratio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="55%" height={300}>
                      <PieChart>
                        <Pie
                          data={winLossData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {winLossData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          iconSize={8}
                          formatter={(value: string) => (
                            <span className="text-xs text-muted-foreground">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-4 min-w-0">
                      <div className="text-center p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                        <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                          {analytics.winningTrades}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Profitable Trades</p>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                        <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">
                          {analytics.losingTrades}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Loss Trades</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-muted/50">
                        <p className="text-lg font-semibold text-foreground">
                          {analytics.winRate}%
                        </p>
                        <p className="text-xs text-muted-foreground">Win Rate</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ChartSkeleton />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Mini Metric Card ────────────────────────────────────────────────────
function MiniMetric({
  icon: Icon,
  label,
  value,
  negative = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl bg-card/80 backdrop-blur border shadow-sm p-3 transition-all hover:shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </p>
      </div>
      <p className={`text-sm font-semibold truncate ${negative ? 'text-red-500' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}
