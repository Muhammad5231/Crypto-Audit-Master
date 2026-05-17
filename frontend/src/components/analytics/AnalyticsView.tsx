'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format as formatDateValue,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import {
  AlertCircle,
  BadgePercent,
  BarChart3,
  Calculator,
  Landmark,
  Play,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Trophy,
  Upload,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAppStore } from '@/store/appStore';
import { reportApi, uploadApi } from '@/lib/api';
import { formatINR } from '@/lib/utils/format';
import { formatRelativeTime } from '@/lib/utils/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type TimeframeKey = '7d' | '30d' | '90d' | '6m' | '1y' | 'all' | 'custom';
type BucketMode = 'day' | 'week' | 'month' | 'quarter';
type PairMetricKey = 'finalNetProfit' | 'grossProfit' | 'tradeCount' | 'fees' | 'directTax';

interface RealizedTrade {
  pair: string;
  buyDate: string;
  sellDate: string;
  matchedQty: string;
  buyPrice: string;
  sellPrice: string;
  buyValue: string;
  sellValue: string;
  grossProfit: string;
  totalFees: string;
  gstOnFees: string;
  tds: string;
  baseCryptoTax?: string;
  tax?: string;
  cess: string;
  totalDirectTax: string;
  netProfitInHand?: string;
  finalNetProfit: string;
}

interface OpenHolding {
  pair: string;
  remainingQty: string;
  avgBuyPrice?: string;
  averageBuyPrice?: string;
  totalBuyValue?: string;
  investedValue?: string;
  sourceCount?: number;
}

interface UploadRecord {
  parsedCount?: number;
}

interface AnalyticsPayload {
  generatedAt: string;
  realizedTrades: RealizedTrade[];
  openHoldings: OpenHolding[];
  summary: Record<string, unknown>;
}

interface TimeframeRange {
  start: Date;
  end: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
  bucketMode: BucketMode;
}

interface TradeTotals {
  finalNetProfit: number;
  grossProfit: number;
  totalFees: number;
  gst: number;
  tds: number;
  baseTax: number;
  cess: number;
  totalDirectTax: number;
  buyValue: number;
  sellValue: number;
  tradeCount: number;
  wins: number;
  losses: number;
}

interface BucketPoint {
  key: string;
  label: string;
  tooltipLabel: string;
  date: Date;
  periodProfit: number;
  cumulativeProfit: number;
  tradeCount: number;
}

interface PairStat {
  pair: string;
  finalNetProfit: number;
  grossProfit: number;
  tradeCount: number;
  totalFees: number;
  totalDirectTax: number;
  gst: number;
  tds: number;
  sellValue: number;
  buyValue: number;
  wins: number;
  losses: number;
}

interface HoldingStat {
  pair: string;
  costBasis: number;
  remainingQty: number;
  lotCount: number;
  avgBuyPrice: number;
}

interface InsightItem {
  label: string;
  value: string;
  helper: string;
  tone?: 'positive' | 'negative' | 'neutral' | 'tax';
}

const TIMEFRAME_OPTIONS: Array<{ key: TimeframeKey; label: string; shortLabel: string }> = [
  { key: '7d', label: '7 Days', shortLabel: '7D' },
  { key: '30d', label: '30 Days', shortLabel: '30D' },
  { key: '90d', label: '90 Days', shortLabel: '90D' },
  { key: '6m', label: '6 Months', shortLabel: '6M' },
  { key: '1y', label: '1 Year', shortLabel: '1Y' },
  { key: 'all', label: 'All Time', shortLabel: 'All' },
  { key: 'custom', label: 'Custom Range', shortLabel: 'Custom' },
];

const PAIR_METRIC_OPTIONS: Array<{ key: PairMetricKey; label: string }> = [
  { key: 'finalNetProfit', label: 'Final Net Profit' },
  { key: 'grossProfit', label: 'Gross Profit' },
  { key: 'tradeCount', label: 'Trade Count' },
  { key: 'fees', label: 'Fees' },
  { key: 'directTax', label: 'Direct Tax' },
];

const RANKING_COLORS = ['#14b8a6', '#06b6d4', '#22c55e', '#2dd4bf', '#38bdf8', '#84cc16'];
const DONUT_COLORS = ['#14b8a6', '#0ea5e9', '#f97316', '#ef4444', '#a855f7', '#facc15'];

function safeNumber(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function compactINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function trimLabel(value: string, max = 14) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function normalizePair(pair: unknown) {
  return String(pair || 'UNKNOWN').toUpperCase();
}

function getWorkspaceId(workspace: any) {
  return workspace?.id || workspace?._id || '';
}

function getTradeDate(trade: RealizedTrade) {
  const parsed = new Date(trade.sellDate || trade.buyDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getLatestTradeDate(trades: RealizedTrade[]) {
  return trades.reduce<Date | null>((latest, trade) => {
    const date = getTradeDate(trade);
    if (!date) return latest;
    if (!latest || date > latest) return date;
    return latest;
  }, null);
}

function getEarliestTradeDate(trades: RealizedTrade[]) {
  return trades.reduce<Date | null>((earliest, trade) => {
    const date = getTradeDate(trade);
    if (!date) return earliest;
    if (!earliest || date < earliest) return date;
    return earliest;
  }, null);
}

function getHoldingCostBasis(holding: OpenHolding) {
  return safeNumber(holding.totalBuyValue ?? holding.investedValue);
}

function getHoldingQuantity(holding: OpenHolding) {
  return safeNumber(holding.remainingQty);
}

function normalizeAnalyticsPayload(input: any): AnalyticsPayload {
  const root = input?.analytics || input || {};
  return {
    generatedAt: root.generatedAt || new Date().toISOString(),
    realizedTrades: Array.isArray(root.realizedTrades) ? root.realizedTrades : [],
    openHoldings: Array.isArray(root.openHoldings) ? root.openHoldings : [],
    summary: root.summary || {},
  };
}

function getBucketMode(
  timeframe: TimeframeKey,
  trades: RealizedTrade[],
  customStart: string,
  customEnd: string
): BucketMode {
  if (timeframe === '7d' || timeframe === '30d') return 'day';
  if (timeframe === '90d') return 'week';
  if (timeframe === '6m' || timeframe === '1y') return 'month';

  const latest = getLatestTradeDate(trades);
  const earliest = getEarliestTradeDate(trades);

  if (timeframe === 'custom') {
    if (customStart && customEnd) {
      const span = Math.max(
        differenceInCalendarDays(new Date(customEnd), new Date(customStart)),
        0
      );
      if (span <= 45) return 'day';
      if (span <= 120) return 'week';
      if (span <= 540) return 'month';
      return 'quarter';
    }
    return 'day';
  }

  if (!latest || !earliest) return 'day';
  const span = differenceInCalendarDays(latest, earliest);
  if (span <= 60) return 'day';
  if (span <= 180) return 'week';
  if (span <= 540) return 'month';
  return 'quarter';
}

function buildTimeframeRange(
  timeframe: TimeframeKey,
  trades: RealizedTrade[],
  customStart: string,
  customEnd: string
): TimeframeRange {
  const latestTradeDate = getLatestTradeDate(trades) || new Date();
  const earliestTradeDate = getEarliestTradeDate(trades) || latestTradeDate;
  const bucketMode = getBucketMode(timeframe, trades, customStart, customEnd);

  if (timeframe === 'all') {
    return {
      start: startOfDay(earliestTradeDate),
      end: endOfDay(latestTradeDate),
      previousStart: null,
      previousEnd: null,
      bucketMode,
    };
  }

  if (timeframe === 'custom') {
    const fallbackEnd = formatDateValue(latestTradeDate, 'yyyy-MM-dd');
    const resolvedStart = customStart || formatDateValue(subDays(latestTradeDate, 29), 'yyyy-MM-dd');
    const resolvedEnd = customEnd || fallbackEnd;
    const start = startOfDay(new Date(resolvedStart));
    const end = endOfDay(new Date(resolvedEnd));
    const span = Math.max(differenceInCalendarDays(end, start), 0);
    const previousEnd = endOfDay(subDays(start, 1));
    const previousStart = startOfDay(subDays(previousEnd, span));

    return {
      start,
      end,
      previousStart,
      previousEnd,
      bucketMode,
    };
  }

  const end = endOfDay(latestTradeDate);
  let start = startOfDay(latestTradeDate);

  if (timeframe === '7d') start = startOfDay(subDays(end, 6));
  if (timeframe === '30d') start = startOfDay(subDays(end, 29));
  if (timeframe === '90d') start = startOfDay(subDays(end, 89));
  if (timeframe === '6m') start = startOfDay(subMonths(end, 6));
  if (timeframe === '1y') start = startOfDay(subMonths(end, 12));

  const previousEnd = endOfDay(subDays(start, 1));
  const daySpan = Math.max(differenceInCalendarDays(end, start), 0);
  const previousStart =
    timeframe === '6m'
      ? startOfDay(subMonths(previousEnd, 6))
      : timeframe === '1y'
        ? startOfDay(subMonths(previousEnd, 12))
        : startOfDay(subDays(previousEnd, daySpan));

  return {
    start,
    end,
    previousStart,
    previousEnd,
    bucketMode,
  };
}

function getBucketStart(date: Date, mode: BucketMode) {
  if (mode === 'day') return startOfDay(date);
  if (mode === 'week') return startOfWeek(date, { weekStartsOn: 1 });
  if (mode === 'quarter') return startOfQuarter(date);
  return startOfMonth(date);
}

function getBucketEnd(date: Date, mode: BucketMode) {
  if (mode === 'day') return endOfDay(date);
  if (mode === 'week') return endOfWeek(date, { weekStartsOn: 1 });
  if (mode === 'quarter') return endOfQuarter(date);
  return endOfMonth(date);
}

function advanceBucket(date: Date, mode: BucketMode) {
  if (mode === 'day') return addDays(date, 1);
  if (mode === 'week') return addWeeks(date, 1);
  if (mode === 'quarter') return addQuarters(date, 1);
  return addMonths(date, 1);
}

function getBucketKey(date: Date, mode: BucketMode) {
  if (mode === 'day') return formatDateValue(date, 'yyyy-MM-dd');
  if (mode === 'week') return formatDateValue(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  if (mode === 'quarter') return `Q${Math.floor(date.getMonth() / 3) + 1}-${date.getFullYear()}`;
  return formatDateValue(startOfMonth(date), 'yyyy-MM');
}

function getBucketLabel(date: Date, mode: BucketMode) {
  if (mode === 'day') return formatDateValue(date, 'dd MMM');
  if (mode === 'week') return formatDateValue(startOfWeek(date, { weekStartsOn: 1 }), 'dd MMM');
  if (mode === 'quarter') return `Q${Math.floor(date.getMonth() / 3) + 1} ${formatDateValue(date, 'yy')}`;
  return formatDateValue(date, 'MMM yy');
}

function getBucketTooltipLabel(date: Date, mode: BucketMode) {
  if (mode === 'day') return formatDateValue(date, 'dd MMM yyyy');
  if (mode === 'week') {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return `${formatDateValue(start, 'dd MMM')} - ${formatDateValue(end, 'dd MMM yyyy')}`;
  }
  if (mode === 'quarter') {
    return `Q${Math.floor(date.getMonth() / 3) + 1} ${formatDateValue(date, 'yyyy')}`;
  }
  return formatDateValue(date, 'MMMM yyyy');
}

function getAxisLabelInterval(mode: BucketMode, totalPoints: number, isMobile: boolean) {
  if (totalPoints <= (isMobile ? 6 : 8)) return 0;
  if (mode === 'day') return totalPoints > 20 ? (isMobile ? 4 : 2) : 1;
  if (mode === 'week') return totalPoints > 10 ? 1 : 0;
  if (mode === 'month') return totalPoints > 8 ? 1 : 0;
  return 0;
}

function filterTrades(
  trades: RealizedTrade[],
  range: TimeframeRange,
  pairFilter: string
) {
  return trades.filter((trade) => {
    const date = getTradeDate(trade);
    if (!date || !isWithinInterval(date, { start: range.start, end: range.end })) {
      return false;
    }
    if (pairFilter === 'all') return true;
    return normalizePair(trade.pair) === pairFilter;
  });
}

function filterPreviousTrades(
  trades: RealizedTrade[],
  range: TimeframeRange,
  pairFilter: string
) {
  if (!range.previousStart || !range.previousEnd) return [];
  return trades.filter((trade) => {
    const date = getTradeDate(trade);
    if (!date || !isWithinInterval(date, { start: range.previousStart!, end: range.previousEnd! })) {
      return false;
    }
    if (pairFilter === 'all') return true;
    return normalizePair(trade.pair) === pairFilter;
  });
}

function aggregateTrades(trades: RealizedTrade[]): TradeTotals {
  return trades.reduce<TradeTotals>(
    (totals, trade) => {
      const finalNet = safeNumber(trade.finalNetProfit);
      totals.finalNetProfit += finalNet;
      totals.grossProfit += safeNumber(trade.grossProfit);
      totals.totalFees += safeNumber(trade.totalFees);
      totals.gst += safeNumber(trade.gstOnFees);
      totals.tds += safeNumber(trade.tds);
      totals.baseTax += safeNumber(trade.baseCryptoTax ?? trade.tax ?? 0);
      totals.cess += safeNumber(trade.cess);
      totals.totalDirectTax += safeNumber(trade.totalDirectTax);
      totals.buyValue += safeNumber(trade.buyValue);
      totals.sellValue += safeNumber(trade.sellValue);
      totals.tradeCount += 1;
      if (finalNet > 0) totals.wins += 1;
      if (finalNet < 0) totals.losses += 1;
      return totals;
    },
    {
      finalNetProfit: 0,
      grossProfit: 0,
      totalFees: 0,
      gst: 0,
      tds: 0,
      baseTax: 0,
      cess: 0,
      totalDirectTax: 0,
      buyValue: 0,
      sellValue: 0,
      tradeCount: 0,
      wins: 0,
      losses: 0,
    }
  );
}

function buildBuckets(
  trades: RealizedTrade[],
  range: TimeframeRange
): BucketPoint[] {
  const bucketMap = new Map<string, BucketPoint>();
  let cursor = getBucketStart(range.start, range.bucketMode);

  while (cursor <= range.end) {
    const key = getBucketKey(cursor, range.bucketMode);
    bucketMap.set(key, {
      key,
      label: getBucketLabel(cursor, range.bucketMode),
      tooltipLabel: getBucketTooltipLabel(cursor, range.bucketMode),
      date: new Date(cursor),
      periodProfit: 0,
      cumulativeProfit: 0,
      tradeCount: 0,
    });
    cursor = advanceBucket(cursor, range.bucketMode);
  }

  trades.forEach((trade) => {
    const date = getTradeDate(trade);
    if (!date || !isWithinInterval(date, { start: range.start, end: range.end })) return;
    const key = getBucketKey(date, range.bucketMode);
    const current = bucketMap.get(key);
    if (!current) return;
    current.periodProfit += safeNumber(trade.finalNetProfit);
    current.tradeCount += 1;
  });

  let cumulative = 0;
  return Array.from(bucketMap.values()).map((bucket) => {
    cumulative += bucket.periodProfit;
    return {
      ...bucket,
      cumulativeProfit: cumulative,
    };
  });
}

function buildPairStats(trades: RealizedTrade[]) {
  const map = new Map<string, PairStat>();

  trades.forEach((trade) => {
    const pair = normalizePair(trade.pair);
    const current = map.get(pair) || {
      pair,
      finalNetProfit: 0,
      grossProfit: 0,
      tradeCount: 0,
      totalFees: 0,
      totalDirectTax: 0,
      gst: 0,
      tds: 0,
      sellValue: 0,
      buyValue: 0,
      wins: 0,
      losses: 0,
    };

    const finalNet = safeNumber(trade.finalNetProfit);
    current.finalNetProfit += finalNet;
    current.grossProfit += safeNumber(trade.grossProfit);
    current.tradeCount += 1;
    current.totalFees += safeNumber(trade.totalFees);
    current.totalDirectTax += safeNumber(trade.totalDirectTax);
    current.gst += safeNumber(trade.gstOnFees);
    current.tds += safeNumber(trade.tds);
    current.sellValue += safeNumber(trade.sellValue);
    current.buyValue += safeNumber(trade.buyValue);
    if (finalNet > 0) current.wins += 1;
    if (finalNet < 0) current.losses += 1;

    map.set(pair, current);
  });

  return Array.from(map.values());
}

function buildHoldingStats(holdings: OpenHolding[], pairFilter: string) {
  const map = new Map<string, HoldingStat>();

  holdings.forEach((holding) => {
    const pair = normalizePair(holding.pair);
    if (pairFilter !== 'all' && pair !== pairFilter) return;

    const current = map.get(pair) || {
      pair,
      costBasis: 0,
      remainingQty: 0,
      lotCount: 0,
      avgBuyPrice: 0,
    };

    current.costBasis += getHoldingCostBasis(holding);
    current.remainingQty += getHoldingQuantity(holding);
    current.lotCount += safeNumber(holding.sourceCount || 1);

    map.set(pair, current);
  });

  return Array.from(map.values())
    .map((holding) => ({
      ...holding,
      avgBuyPrice: holding.remainingQty > 0 ? holding.costBasis / holding.remainingQty : 0,
    }))
    .sort((a, b) => b.costBasis - a.costBasis);
}

function getChangePercent(currentValue: number, previousValue: number) {
  if (Math.abs(previousValue) < 0.0001) return null;
  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
}

function getPairMetricValue(pair: PairStat, metric: PairMetricKey) {
  if (metric === 'grossProfit') return pair.grossProfit;
  if (metric === 'tradeCount') return pair.tradeCount;
  if (metric === 'fees') return pair.totalFees;
  if (metric === 'directTax') return pair.totalDirectTax;
  return pair.finalNetProfit;
}

function formatMetricValue(value: number, metric: PairMetricKey) {
  if (metric === 'tradeCount') return `${value}`;
  return formatINR(value);
}

function getPairMetricTitle(metric: PairMetricKey) {
  if (metric === 'grossProfit') return 'Top Gross Profit Pairs';
  if (metric === 'tradeCount') return 'Most Traded Pairs';
  if (metric === 'fees') return 'Highest Fee Pairs';
  if (metric === 'directTax') return 'Highest Direct Tax Pairs';
  return 'Top Profitable Pairs';
}

function getBucketModeLabel(mode: BucketMode) {
  if (mode === 'day') return 'daily';
  if (mode === 'week') return 'weekly';
  if (mode === 'quarter') return 'quarterly';
  return 'monthly';
}

function buildAxisTooltip(theme: 'light' | 'dark', formatter: (params: any) => string) {
  return {
    trigger: 'axis',
    backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255,255,255,0.98)',
    borderColor: theme === 'dark' ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.08)',
    textStyle: {
      color: theme === 'dark' ? '#e2e8f0' : '#0f172a',
      fontFamily: 'inherit',
    },
    padding: 12,
    axisPointer: {
      lineStyle: {
        color: theme === 'dark' ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.18)',
      },
    },
    formatter,
  };
}

function buildProfitOverTimeOption(
  buckets: BucketPoint[],
  theme: 'light' | 'dark',
  isMobile: boolean,
  mode: BucketMode
): EChartsOption {
  const interval = getAxisLabelInterval(mode, buckets.length, isMobile);

  return {
    animationDuration: 500,
    grid: {
      left: 16,
      right: 12,
      top: 24,
      bottom: 30,
      containLabel: true,
    },
    tooltip: buildAxisTooltip(theme, (params) => {
      const item = Array.isArray(params) ? params[0] : params;
      const point = buckets[item.dataIndex];
      return `
        <div style="font-size:12px;line-height:1.55">
          <div style="opacity:.72;margin-bottom:6px;">${point?.tooltipLabel || item.axisValueLabel}</div>
          <div style="font-weight:600">Cumulative Final Net: ${formatINR(item.value)}</div>
        </div>
      `;
    }),
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: buckets.map((bucket) => bucket.label),
      axisLine: { lineStyle: { color: theme === 'dark' ? '#1e293b' : '#dbe3ee' } },
      axisTick: { show: false },
      axisLabel: {
        color: theme === 'dark' ? '#94a3b8' : '#64748b',
        fontSize: isMobile ? 10 : 11,
        interval,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: theme === 'dark' ? '#94a3b8' : '#64748b',
        formatter: (value: number) => compactINR(value),
        fontSize: isMobile ? 10 : 11,
      },
      splitLine: {
        lineStyle: {
          color: theme === 'dark' ? 'rgba(148,163,184,.12)' : 'rgba(15,23,42,.08)',
        },
      },
    },
    series: [
      {
        type: 'line',
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: isMobile ? 6 : 7,
        data: buckets.map((bucket) => Number(bucket.cumulativeProfit.toFixed(2))),
        lineStyle: { width: 3, color: '#14b8a6' },
        itemStyle: {
          color: '#14b8a6',
          borderColor: theme === 'dark' ? '#0f172a' : '#ffffff',
          borderWidth: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(20,184,166,0.26)' },
              { offset: 1, color: 'rgba(20,184,166,0.02)' },
            ],
          },
        },
      },
    ],
  };
}

function buildTrendOption(
  buckets: BucketPoint[],
  theme: 'light' | 'dark',
  isMobile: boolean,
  mode: BucketMode
): EChartsOption {
  const interval = getAxisLabelInterval(mode, buckets.length, isMobile);

  return {
    animationDuration: 500,
    grid: {
      left: 16,
      right: 12,
      top: 24,
      bottom: 30,
      containLabel: true,
    },
    tooltip: buildAxisTooltip(theme, (params) => {
      const item = Array.isArray(params) ? params[0] : params;
      const point = buckets[item.dataIndex];
      return `
        <div style="font-size:12px;line-height:1.55">
          <div style="opacity:.72;margin-bottom:6px;">${point?.tooltipLabel || item.axisValueLabel}</div>
          <div style="font-weight:600">Realized Final Net: ${formatINR(item.value)}</div>
        </div>
      `;
    }),
    xAxis: {
      type: 'category',
      data: buckets.map((bucket) => bucket.label),
      axisLine: { lineStyle: { color: theme === 'dark' ? '#1e293b' : '#dbe3ee' } },
      axisTick: { show: false },
      axisLabel: {
        color: theme === 'dark' ? '#94a3b8' : '#64748b',
        fontSize: isMobile ? 10 : 11,
        interval,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: true,
        lineStyle: { color: theme === 'dark' ? 'rgba(148,163,184,.28)' : 'rgba(15,23,42,.16)' },
      },
      axisLabel: {
        color: theme === 'dark' ? '#94a3b8' : '#64748b',
        formatter: (value: number) => compactINR(value),
        fontSize: isMobile ? 10 : 11,
      },
      splitLine: {
        lineStyle: {
          color: theme === 'dark' ? 'rgba(148,163,184,.12)' : 'rgba(15,23,42,.08)',
        },
      },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: isMobile ? 18 : 24,
        data: buckets.map((bucket) => ({
          value: Number(bucket.periodProfit.toFixed(2)),
          itemStyle: {
            color: bucket.periodProfit >= 0 ? '#14b8a6' : '#f97316',
            borderRadius: bucket.periodProfit >= 0 ? [8, 8, 0, 0] : [0, 0, 8, 8],
          },
        })),
      },
    ],
  };
}

function buildHorizontalBarOption({
  items,
  theme,
  isMobile,
  metric,
  negativeColor = '#f97316',
  positiveColor = '#14b8a6',
}: {
  items: Array<{ label: string; value: number; note?: string }>;
  theme: 'light' | 'dark';
  isMobile: boolean;
  metric: PairMetricKey;
  negativeColor?: string;
  positiveColor?: string;
}): EChartsOption {
  return {
    animationDuration: 450,
    grid: {
      left: isMobile ? 12 : 18,
      right: 14,
      top: 16,
      bottom: 18,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255,255,255,0.98)',
      borderColor: theme === 'dark' ? 'rgba(148,163,184,.18)' : 'rgba(15,23,42,.08)',
      textStyle: {
        color: theme === 'dark' ? '#e2e8f0' : '#0f172a',
        fontFamily: 'inherit',
      },
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const source = items[item.dataIndex];
        return `
          <div style="font-size:12px;line-height:1.55">
            <div style="opacity:.72;margin-bottom:6px;">${source?.label || item.axisValueLabel}</div>
            <div style="font-weight:600">${formatMetricValue(item.value, metric)}</div>
            ${source?.note ? `<div style="opacity:.75;margin-top:4px;">${source.note}</div>` : ''}
          </div>
        `;
      },
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: theme === 'dark' ? '#94a3b8' : '#64748b',
        formatter: (value: number) => (metric === 'tradeCount' ? `${value}` : compactINR(value)),
        fontSize: isMobile ? 10 : 11,
      },
      splitLine: {
        lineStyle: {
          color: theme === 'dark' ? 'rgba(148,163,184,.12)' : 'rgba(15,23,42,.08)',
        },
      },
    },
    yAxis: {
      type: 'category',
      data: items.map((item) => trimLabel(item.label, isMobile ? 12 : 18)),
      axisLabel: {
        color: theme === 'dark' ? '#cbd5e1' : '#334155',
        fontWeight: 600,
        fontSize: isMobile ? 10 : 11,
        width: isMobile ? 80 : 104,
        overflow: 'truncate',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 18,
        data: items.map((item, index) => ({
          value: Number(item.value.toFixed(2)),
          itemStyle: {
            color:
              metric === 'tradeCount'
                ? '#0ea5e9'
                : item.value < 0
                  ? negativeColor
                  : RANKING_COLORS[index % RANKING_COLORS.length] || positiveColor,
            borderRadius: item.value < 0 ? [8, 0, 0, 8] : [0, 8, 8, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          formatter: ({ value }: { value: number }) => formatMetricValue(value, metric),
          color: theme === 'dark' ? '#e2e8f0' : '#0f172a',
          fontSize: 10,
        },
      },
    ],
  };
}

function buildDonutOption({
  data,
  centerValue,
  centerLabel,
  theme,
}: {
  data: Array<{ name: string; value: number }>;
  centerValue: string;
  centerLabel: string;
  theme: 'light' | 'dark';
}): EChartsOption {
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255,255,255,0.98)',
      borderColor: theme === 'dark' ? 'rgba(148,163,184,.18)' : 'rgba(15,23,42,.08)',
      textStyle: {
        color: theme === 'dark' ? '#e2e8f0' : '#0f172a',
        fontFamily: 'inherit',
      },
      formatter: (params: any) => `
        <div style="font-size:12px;line-height:1.55">
          <div style="opacity:.72;margin-bottom:6px;">${params.name}</div>
          <div style="font-weight:600">${formatINR(params.value)}</div>
        </div>
      `,
    },
    series: [
      {
        type: 'pie',
        radius: ['56%', '78%'],
        center: ['50%', '50%'],
        data: data.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: DONUT_COLORS[index % DONUT_COLORS.length],
            borderColor: theme === 'dark' ? '#0f172a' : '#ffffff',
            borderWidth: 4,
          },
        })),
        label: { show: false },
        labelLine: { show: false },
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '42%',
        style: {
          text: centerValue,
          textAlign: 'center',
          fill: theme === 'dark' ? '#f8fafc' : '#0f172a',
          fontSize: 16,
          fontWeight: 700,
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '55%',
        style: {
          text: centerLabel,
          textAlign: 'center',
          fill: theme === 'dark' ? '#94a3b8' : '#64748b',
          fontSize: 11,
          fontWeight: 500,
        },
      },
    ],
  };
}

function buildImpactBridgeOption(
  values: Array<{ label: string; value: number; note?: string }>,
  theme: 'light' | 'dark',
  isMobile: boolean
): EChartsOption {
  return {
    animationDuration: 450,
    grid: {
      left: 14,
      right: 12,
      top: 18,
      bottom: isMobile ? 42 : 26,
      containLabel: true,
    },
    tooltip: buildAxisTooltip(theme, (params) => {
      const item = Array.isArray(params) ? params[0] : params;
      const source = values[item.dataIndex];
      return `
        <div style="font-size:12px;line-height:1.55">
          <div style="opacity:.72;margin-bottom:6px;">${source?.label || item.axisValueLabel}</div>
          <div style="font-weight:600">${formatINR(item.value)}</div>
          ${source?.note ? `<div style="opacity:.75;margin-top:4px;">${source.note}</div>` : ''}
        </div>
      `;
    }),
    xAxis: {
      type: 'category',
      data: values.map((item) => item.label),
      axisLabel: {
        color: theme === 'dark' ? '#94a3b8' : '#64748b',
        fontSize: isMobile ? 10 : 11,
        interval: 0,
        rotate: isMobile ? 0 : 0,
      },
      axisLine: { lineStyle: { color: theme === 'dark' ? '#1e293b' : '#dbe3ee' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: theme === 'dark' ? '#94a3b8' : '#64748b',
        formatter: (value: number) => compactINR(value),
        fontSize: isMobile ? 10 : 11,
      },
      splitLine: {
        lineStyle: {
          color: theme === 'dark' ? 'rgba(148,163,184,.12)' : 'rgba(15,23,42,.08)',
        },
      },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: isMobile ? 22 : 34,
        data: values.map((item) => ({
          value: Number(item.value.toFixed(2)),
          itemStyle: {
            color:
              item.label === 'Gross Profit'
                ? '#14b8a6'
                : item.label === 'Final Net Profit'
                  ? '#0ea5e9'
                  : item.label === 'TDS Withheld'
                    ? '#22c55e'
                    : '#f97316',
            borderRadius: item.value >= 0 ? [8, 8, 0, 0] : [0, 0, 8, 8],
          },
        })),
      },
    ],
  };
}

function getMobileSummaryValue(timeframe: TimeframeKey) {
  return TIMEFRAME_OPTIONS.find((option) => option.key === timeframe)?.label || '30 Days';
}

function getPairMetricSummary(metric: PairMetricKey) {
  return PAIR_METRIC_OPTIONS.find((option) => option.key === metric)?.label || 'Final Net Profit';
}

function ComparisonBadge({
  change,
}: {
  change: number | null;
}) {
  if (change === null) {
    return (
      <span className="inline-flex rounded-full bg-muted/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        First window
      </span>
    );
  }

  const positive = change >= 0;
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium',
        positive
          ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
          : 'bg-orange-500/12 text-orange-600 dark:text-orange-400'
      )}
    >
      {positive ? '+' : ''}
      {change.toFixed(1)}% vs previous window
    </span>
  );
}

function AnalyticsMetricCard({
  title,
  value,
  helper,
  icon,
  change,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  helper: string;
  icon: ReactNode;
  change: number | null;
  tone?: 'positive' | 'negative' | 'neutral' | 'tax';
}) {
  const accentClass =
    tone === 'positive'
      ? 'border-emerald-500/18'
      : tone === 'negative'
        ? 'border-red-500/18'
        : tone === 'tax'
          ? 'border-orange-500/18'
          : 'border-sky-500/18';

  const glowClass =
    tone === 'positive'
      ? 'bg-emerald-500/12 text-emerald-500'
      : tone === 'negative'
        ? 'bg-red-500/12 text-red-500'
        : tone === 'tax'
          ? 'bg-orange-500/12 text-orange-500'
          : 'bg-sky-500/12 text-sky-500';

  return (
    <Card className={cn('relative overflow-hidden rounded-[26px] border bg-gradient-to-br from-card via-card to-muted/[0.12] shadow-sm', accentClass)}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <CardContent className="relative flex min-h-[164px] flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/95">
              {title}
            </p>
            <p className="text-[22px] font-black leading-none tracking-[-0.025em] text-foreground">
              {value}
            </p>
          </div>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/5', glowClass)}>
            {icon}
          </div>
        </div>

        <p className="min-h-[2.2rem] text-[12px] leading-5 text-muted-foreground/92">{helper}</p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
          <ComparisonBadge change={change} />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartPanel({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn('relative overflow-hidden rounded-[28px] border-border/50 bg-gradient-to-br from-card via-card to-muted/15 shadow-sm', className)}>
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-white/[0.03] blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <CardHeader className="space-y-3 p-4 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-foreground">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function LegendList({
  items,
  totalLabel,
}: {
  items: Array<{ name: string; value: number }>;
  totalLabel: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const share = total ? (item.value / total) * 100 : 0;
        return (
          <div key={item.name} className="flex items-center gap-3 rounded-2xl bg-muted/25 px-3 py-2.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">{share.toFixed(1)}% share</p>
            </div>
            <p className="text-sm font-semibold text-foreground">{formatINR(item.value)}</p>
          </div>
        );
      })}
      {items.length ? (
        <div className="flex items-center justify-between border-t border-border/50 pt-3 text-sm">
          <span className="text-muted-foreground">{totalLabel}</span>
          <span className="font-semibold text-foreground">{formatINR(total)}</span>
        </div>
      ) : null}
    </div>
  );
}

function InsightCard({ item }: { item: InsightItem }) {
  return (
    <div className="rounded-[24px] border border-border/50 bg-muted/20 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
      <p
        className={cn(
          'mt-2 text-lg font-black leading-none',
          item.tone === 'positive'
            ? 'text-emerald-500'
            : item.tone === 'negative'
              ? 'text-orange-500'
              : item.tone === 'tax'
                ? 'text-orange-500'
                : 'text-foreground'
        )}
      >
        {item.value}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.helper}</p>
    </div>
  );
}

function SectionEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
      <BarChart3 className="h-9 w-9 text-muted-foreground/45" />
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function AnalyticsEmptyState({
  icon,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryDisabled,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  primaryDisabled?: boolean;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-3xl rounded-[34px] border-border/50 bg-card/85 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-500/10">
            {icon}
          </div>
          <h2 className="mt-6 text-3xl font-black tracking-tight text-foreground">{title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              className="rounded-2xl bg-teal-600 px-5 text-white hover:bg-teal-700"
              onClick={onPrimary}
              disabled={primaryDisabled}
            >
              {primaryLabel}
            </Button>
            {secondaryLabel && onSecondary ? (
              <Button variant="outline" className="rounded-2xl px-5" onClick={onSecondary}>
                {secondaryLabel}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsLoadingState() {
  return (
    <div className="space-y-4">
      <Card className="rounded-[28px] border-border/50">
        <CardContent className="p-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[164px] rounded-[26px]" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-10">
        <Skeleton className="h-[392px] rounded-[28px] lg:col-span-6" />
        <Skeleton className="h-[392px] rounded-[28px] lg:col-span-4" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[372px] rounded-[28px]" />
        <Skeleton className="h-[372px] rounded-[28px]" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[340px] rounded-[28px]" />
        <Skeleton className="h-[340px] rounded-[28px]" />
        <Skeleton className="h-[340px] rounded-[28px]" />
      </div>
    </div>
  );
}

function DesktopControlBar({
  timeframe,
  pairFilter,
  pairMetric,
  pairOptions,
  customStart,
  customEnd,
  onTimeframeChange,
  onPairChange,
  onMetricChange,
  onCustomStartChange,
  onCustomEndChange,
  onReset,
}: {
  timeframe: TimeframeKey;
  pairFilter: string;
  pairMetric: PairMetricKey;
  pairOptions: string[];
  customStart: string;
  customEnd: string;
  onTimeframeChange: (value: TimeframeKey) => void;
  onPairChange: (value: string) => void;
  onMetricChange: (value: PairMetricKey) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <Card className="rounded-[28px] border-border/50 bg-gradient-to-br from-card via-card to-muted/15 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="overflow-x-auto">
          <div className="inline-flex min-w-full items-center rounded-[20px] border border-border/60 bg-gradient-to-r from-card via-card to-muted/20 p-1.5 shadow-sm shadow-black/5 sm:min-w-0">
            {TIMEFRAME_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onTimeframeChange(option.key)}
                className={cn(
                  'rounded-2xl px-4 py-2 text-sm font-medium transition-all',
                  timeframe === option.key
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Select value={pairFilter} onValueChange={onPairChange}>
            <SelectTrigger className="h-11 w-full rounded-2xl border-border/60 bg-background/55 px-4">
              <SelectValue placeholder="All Pairs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pairs</SelectItem>
              {pairOptions.map((pair) => (
                <SelectItem key={pair} value={pair}>
                  {pair}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={pairMetric} onValueChange={(value) => onMetricChange(value as PairMetricKey)}>
            <SelectTrigger className="h-11 w-full rounded-2xl border-border/60 bg-background/55 px-4">
              <SelectValue placeholder="Pair Metric" />
            </SelectTrigger>
            <SelectContent>
              {PAIR_METRIC_OPTIONS.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {timeframe === 'custom' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="date"
                value={customStart}
                onChange={(event) => onCustomStartChange(event.target.value)}
                className="h-11 rounded-2xl border-border/60 bg-background/55 px-4"
              />
              <Input
                type="date"
                value={customEnd}
                onChange={(event) => onCustomEndChange(event.target.value)}
                className="h-11 rounded-2xl border-border/60 bg-background/55 px-4"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
              Open holdings stay on the latest snapshot while realized-trade analytics follow the selected period.
            </div>
          )}

          <Button variant="outline" className="h-11 rounded-2xl px-4" onClick={onReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MobileControlBar({
  open,
  onOpenChange,
  timeframe,
  pairFilter,
  pairMetric,
  pairOptions,
  customStart,
  customEnd,
  onTimeframeChange,
  onPairChange,
  onMetricChange,
  onCustomStartChange,
  onCustomEndChange,
  onReset,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  timeframe: TimeframeKey;
  pairFilter: string;
  pairMetric: PairMetricKey;
  pairOptions: string[];
  customStart: string;
  customEnd: string;
  onTimeframeChange: (value: TimeframeKey) => void;
  onPairChange: (value: string) => void;
  onMetricChange: (value: PairMetricKey) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <>
      <Card className="rounded-[28px] border-border/50 bg-gradient-to-br from-card via-card to-muted/15 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Analytics Filters</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {getMobileSummaryValue(timeframe)}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {pairFilter === 'all' ? 'All Pairs' : pairFilter}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {getPairMetricSummary(pairMetric)}
                </Badge>
              </div>
            </div>

            <Button variant="outline" className="rounded-2xl px-4" onClick={() => onOpenChange(true)}>
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[88vh] rounded-t-[28px] border-border/60 px-0">
          <SheetHeader className="px-4 pb-0 text-left">
            <SheetTitle>Analytics Filters</SheetTitle>
            <SheetDescription>Adjust the period, pair, and pair-comparison lens for deep analytics.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 py-4">
            <div className="overflow-x-auto">
              <div className="inline-flex min-w-full items-center rounded-[20px] border border-border/60 bg-gradient-to-r from-card via-card to-muted/20 p-1.5 shadow-sm shadow-black/5 sm:min-w-0">
                {TIMEFRAME_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => onTimeframeChange(option.key)}
                    className={cn(
                      'rounded-2xl px-3 py-2 text-sm font-medium transition-all whitespace-nowrap',
                      timeframe === option.key
                        ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                        : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                    )}
                  >
                    {option.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            <Select value={pairFilter} onValueChange={onPairChange}>
              <SelectTrigger className="h-11 w-full rounded-2xl border-border/60 bg-background/55 px-4">
                <SelectValue placeholder="All Pairs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pairs</SelectItem>
                {pairOptions.map((pair) => (
                  <SelectItem key={pair} value={pair}>
                    {pair}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={pairMetric} onValueChange={(value) => onMetricChange(value as PairMetricKey)}>
              <SelectTrigger className="h-11 w-full rounded-2xl border-border/60 bg-background/55 px-4">
                <SelectValue placeholder="Pair Metric" />
              </SelectTrigger>
              <SelectContent>
                {PAIR_METRIC_OPTIONS.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {timeframe === 'custom' ? (
              <div className="grid gap-3">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(event) => onCustomStartChange(event.target.value)}
                  className="h-11 rounded-2xl border-border/60 bg-background/55 px-4"
                />
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(event) => onCustomEndChange(event.target.value)}
                  className="h-11 rounded-2xl border-border/60 bg-background/55 px-4"
                />
              </div>
            ) : null}
          </div>

          <SheetFooter className="px-4 pb-6 sm:flex-row sm:justify-between">
            <Button variant="outline" className="rounded-2xl" onClick={onReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Filters
            </Button>
            <Button className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function AnalyticsView() {
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const { setCurrentView } = useAppStore();
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();

  const workspaceId = getWorkspaceId(activeWorkspace);
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeKey>('30d');
  const [pairFilter, setPairFilter] = useState<string>('all');
  const [pairMetric, setPairMetric] = useState<PairMetricKey>('finalNetProfit');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!workspaceId) {
      setAnalytics(null);
      setUploads([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const [analyticsResult, uploadsResult] = await Promise.allSettled([
      reportApi.getAnalytics(workspaceId),
      uploadApi.list(workspaceId),
    ]);

    if (uploadsResult.status === 'fulfilled') {
      setUploads(Array.isArray(uploadsResult.value?.uploads) ? uploadsResult.value.uploads : []);
    } else {
      setUploads([]);
    }

    if (analyticsResult.status === 'fulfilled') {
      setAnalytics(normalizeAnalyticsPayload(analyticsResult.value));
      setError(null);
    } else {
      const message =
        analyticsResult.reason instanceof Error
          ? analyticsResult.reason.message
          : 'Unable to load analytics.';

      if (message.includes('404') || message.toLowerCase().includes('no completed report')) {
        setAnalytics(null);
        setError(null);
      } else {
        setAnalytics(null);
        setError(message);
      }
    }

    setIsLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!analytics?.realizedTrades.length) return;
    if (customStart && customEnd) return;

    const latest = getLatestTradeDate(analytics.realizedTrades) || new Date();
    setCustomEnd(formatDateValue(latest, 'yyyy-MM-dd'));
    setCustomStart(formatDateValue(subDays(latest, 29), 'yyyy-MM-dd'));
  }, [analytics, customEnd, customStart]);

  const handleResetFilters = useCallback(() => {
    setTimeframe('30d');
    setPairFilter('all');
    setPairMetric('finalNetProfit');

    if (analytics?.realizedTrades.length) {
      const latest = getLatestTradeDate(analytics.realizedTrades) || new Date();
      setCustomEnd(formatDateValue(latest, 'yyyy-MM-dd'));
      setCustomStart(formatDateValue(subDays(latest, 29), 'yyyy-MM-dd'));
    } else {
      setCustomStart('');
      setCustomEnd('');
    }
  }, [analytics]);

  const handleProcessReport = useCallback(async () => {
    if (!workspaceId) return;
    setIsProcessing(true);

    try {
      const result = await reportApi.process(workspaceId);
      toast.success('Analytics report ready', {
        description: `${result.realizedCount || 0} realized trades and ${result.holdingsCount || 0} open holdings refreshed.`,
      });
      await loadAnalytics();
    } catch (err: any) {
      toast.error('Process failed', {
        description: err?.message || 'Unable to process the analytics report.',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [loadAnalytics, workspaceId]);

  const realizedTrades = analytics?.realizedTrades || [];
  const openHoldings = analytics?.openHoldings || [];
  const hasUploads = uploads.length > 0;
  const hasWorkspace = Boolean(workspaceId);
  const hasAnalyticsData = realizedTrades.length > 0 || openHoldings.length > 0;

  const pairOptions = useMemo(() => {
    const values = new Set<string>();
    realizedTrades.forEach((trade) => values.add(normalizePair(trade.pair)));
    openHoldings.forEach((holding) => values.add(normalizePair(holding.pair)));
    return Array.from(values).sort();
  }, [openHoldings, realizedTrades]);

  const timeframeRange = useMemo(
    () => buildTimeframeRange(timeframe, realizedTrades, customStart, customEnd),
    [customEnd, customStart, realizedTrades, timeframe]
  );

  const filteredTrades = useMemo(
    () => filterTrades(realizedTrades, timeframeRange, pairFilter),
    [pairFilter, realizedTrades, timeframeRange]
  );

  const previousTrades = useMemo(
    () => filterPreviousTrades(realizedTrades, timeframeRange, pairFilter),
    [pairFilter, realizedTrades, timeframeRange]
  );

  const totals = useMemo(() => aggregateTrades(filteredTrades), [filteredTrades]);
  const previousTotals = useMemo(() => aggregateTrades(previousTrades), [previousTrades]);
  const pairStats = useMemo(() => buildPairStats(filteredTrades), [filteredTrades]);
  const buckets = useMemo(() => buildBuckets(filteredTrades, timeframeRange), [filteredTrades, timeframeRange]);
  const holdingStats = useMemo(() => buildHoldingStats(openHoldings, pairFilter), [openHoldings, pairFilter]);

  const totalDeductions = totals.totalFees + totals.gst + totals.tds + totals.totalDirectTax;
  const averageProfitPerTrade = totals.tradeCount > 0 ? totals.finalNetProfit / totals.tradeCount : 0;
  const winRate = totals.tradeCount > 0 ? (totals.wins / totals.tradeCount) * 100 : 0;
  const lossRate = totals.tradeCount > 0 ? (totals.losses / totals.tradeCount) * 100 : 0;
  const profitSurvivalRate = Math.abs(totals.grossProfit) > 0.0001 ? (totals.finalNetProfit / totals.grossProfit) * 100 : 0;

  const profitableTrades = filteredTrades.filter((trade) => safeNumber(trade.finalNetProfit) > 0);
  const losingTrades = filteredTrades.filter((trade) => safeNumber(trade.finalNetProfit) < 0);

  const averageWinningTrade = profitableTrades.length
    ? profitableTrades.reduce((sum, trade) => sum + safeNumber(trade.finalNetProfit), 0) / profitableTrades.length
    : 0;
  const averageLosingTrade = losingTrades.length
    ? losingTrades.reduce((sum, trade) => sum + safeNumber(trade.finalNetProfit), 0) / losingTrades.length
    : 0;

  const bestPair = useMemo(
    () => [...pairStats].sort((a, b) => b.finalNetProfit - a.finalNetProfit)[0] || null,
    [pairStats]
  );

  const topPairsByMetric = useMemo(() => {
    const selectedMetricPairs = [...pairStats].sort(
      (a, b) => getPairMetricValue(b, pairMetric) - getPairMetricValue(a, pairMetric)
    );

    return selectedMetricPairs
      .filter((pair) => {
        const value = getPairMetricValue(pair, pairMetric);
        if (pairMetric === 'finalNetProfit' || pairMetric === 'grossProfit') return value > 0;
        return value > 0;
      })
      .slice(0, 10)
      .map((pair) => ({
        label: pair.pair,
        value: getPairMetricValue(pair, pairMetric),
        note:
          pairMetric === 'tradeCount'
            ? `${pair.wins} wins / ${pair.losses} losses`
            : `${pair.tradeCount} realized trades`,
      }));
  }, [pairMetric, pairStats]);

  const lossPairs = useMemo(
    () =>
      [...pairStats]
        .filter((pair) => pair.finalNetProfit < 0)
        .sort((a, b) => a.finalNetProfit - b.finalNetProfit)
        .slice(0, 10)
        .map((pair) => ({
          label: pair.pair,
          value: pair.finalNetProfit,
          note: `${pair.tradeCount} realized trades`,
        })),
    [pairStats]
  );

  const tradeCountByPair = useMemo(
    () =>
      [...pairStats]
        .sort((a, b) => b.tradeCount - a.tradeCount)
        .slice(0, 10)
        .map((pair) => ({
          label: pair.pair,
          value: pair.tradeCount,
          note: formatINR(pair.finalNetProfit),
        })),
    [pairStats]
  );

  const deductionsBreakdown = useMemo(
    () =>
      [
        { name: 'Total Fees', value: Math.abs(totals.totalFees) },
        { name: 'GST on Fees', value: Math.abs(totals.gst) },
        { name: 'TDS Withheld', value: Math.abs(totals.tds) },
        { name: 'Direct Tax', value: Math.abs(totals.totalDirectTax) },
      ].filter((item) => item.value > 0),
    [totals.gst, totals.tds, totals.totalDirectTax, totals.totalFees]
  );

  const winLossBreakdown = useMemo(
    () => [
      { name: 'Profitable Trades', value: totals.wins },
      { name: 'Loss Trades', value: totals.losses },
    ].filter((item) => item.value > 0),
    [totals.losses, totals.wins]
  );

  const impactBridgeData = useMemo(
    () => [
      { label: 'Gross Profit', value: totals.grossProfit, note: 'Before all deductions' },
      { label: 'Fees', value: -Math.abs(totals.totalFees), note: 'Buy and sell fees' },
      { label: 'GST', value: -Math.abs(totals.gst), note: 'Applied on fees only' },
      { label: 'TDS Withheld', value: Math.abs(totals.tds), note: 'Withheld credit, not final liability' },
      { label: 'Direct Tax', value: -Math.abs(totals.totalDirectTax), note: 'Base tax plus cess' },
      { label: 'Final Net Profit', value: totals.finalNetProfit, note: 'After deductions and credits' },
    ],
    [totals.finalNetProfit, totals.gst, totals.tds, totals.totalDirectTax, totals.totalFees, totals.grossProfit]
  );

  const holdingsAllocationData = useMemo(
    () =>
      holdingStats.slice(0, 6).map((holding) => ({
        name: holding.pair,
        value: holding.costBasis,
      })),
    [holdingStats]
  );

  const holdingsDistributionData = useMemo(
    () =>
      holdingStats.slice(0, 10).map((holding) => ({
        label: holding.pair,
        value: holding.costBasis,
        note: `${holding.remainingQty.toFixed(4)} units remaining`,
      })),
    [holdingStats]
  );

  const insights = useMemo<InsightItem[]>(() => {
    const highestProfitTrade = [...filteredTrades].sort(
      (a, b) => safeNumber(b.finalNetProfit) - safeNumber(a.finalNetProfit)
    )[0];
    const highestLossTrade = [...filteredTrades].sort(
      (a, b) => safeNumber(a.finalNetProfit) - safeNumber(b.finalNetProfit)
    )[0];
    const mostTradedPair = [...pairStats].sort((a, b) => b.tradeCount - a.tradeCount)[0];
    const highestFeesPair = [...pairStats].sort((a, b) => b.totalFees - a.totalFees)[0];

    return [
      highestProfitTrade
        ? {
            label: 'Highest Profit Trade',
            value: formatINR(highestProfitTrade.finalNetProfit),
            helper: `${normalizePair(highestProfitTrade.pair)} on ${formatDateValue(getTradeDate(highestProfitTrade) || new Date(), 'dd MMM yyyy')}`,
            tone: 'positive',
          }
        : null,
      highestLossTrade
        ? {
            label: 'Highest Loss Trade',
            value: formatINR(highestLossTrade.finalNetProfit),
            helper: `${normalizePair(highestLossTrade.pair)} on ${formatDateValue(getTradeDate(highestLossTrade) || new Date(), 'dd MMM yyyy')}`,
            tone: 'negative',
          }
        : null,
      mostTradedPair
        ? {
            label: 'Most Traded Pair',
            value: mostTradedPair.pair,
            helper: `${mostTradedPair.tradeCount} realized trade cycles`,
            tone: 'neutral',
          }
        : null,
      highestFeesPair
        ? {
            label: 'Highest Fees Pair',
            value: highestFeesPair.pair,
            helper: `${formatINR(highestFeesPair.totalFees)} in total fees`,
            tone: 'tax',
          }
        : null,
    ].filter(Boolean) as InsightItem[];
  }, [filteredTrades, pairStats]);

  const noFilteredData = realizedTrades.length > 0 && filteredTrades.length === 0;

  const finalNetChange = getChangePercent(totals.finalNetProfit, previousTotals.finalNetProfit);
  const grossChange = getChangePercent(totals.grossProfit, previousTotals.grossProfit);
  const averageChange = getChangePercent(averageProfitPerTrade, previousTotals.tradeCount > 0 ? previousTotals.finalNetProfit / previousTotals.tradeCount : 0);
  const winRateChange = getChangePercent(winRate, previousTotals.tradeCount > 0 ? (previousTotals.wins / previousTotals.tradeCount) * 100 : 0);
  const deductionChange = getChangePercent(totalDeductions, previousTotals.totalFees + previousTotals.gst + previousTotals.tds + previousTotals.totalDirectTax);

  const bestPairShare =
    bestPair && totals.finalNetProfit > 0.0001 && bestPair.finalNetProfit > 0
      ? (bestPair.finalNetProfit / totals.finalNetProfit) * 100
      : null;

  const pairScopeLabel = pairFilter === 'all' ? 'All pairs' : pairFilter;
  const rangeLabel =
    filteredTrades.length > 0
      ? `${formatDateValue(timeframeRange.start, 'dd MMM yyyy')} - ${formatDateValue(timeframeRange.end, 'dd MMM yyyy')}`
      : 'No realized trade activity in this range';

  const profitOverTimeOption = useMemo(
    () => buildProfitOverTimeOption(buckets, theme, isMobile, timeframeRange.bucketMode),
    [buckets, isMobile, theme, timeframeRange.bucketMode]
  );

  const realizedTrendOption = useMemo(
    () => buildTrendOption(buckets, theme, isMobile, timeframeRange.bucketMode),
    [buckets, isMobile, theme, timeframeRange.bucketMode]
  );

  const topPairsOption = useMemo(
    () =>
      buildHorizontalBarOption({
        items: topPairsByMetric,
        theme,
        isMobile,
        metric: pairMetric,
      }),
    [topPairsByMetric, theme, isMobile, pairMetric]
  );

  const lossPairsOption = useMemo(
    () =>
      buildHorizontalBarOption({
        items: lossPairs,
        theme,
        isMobile,
        metric: 'finalNetProfit',
        negativeColor: '#f97316',
      }),
    [lossPairs, theme, isMobile]
  );

  const tradeCountByPairOption = useMemo(
    () =>
      buildHorizontalBarOption({
        items: tradeCountByPair,
        theme,
        isMobile,
        metric: 'tradeCount',
      }),
    [tradeCountByPair, theme, isMobile]
  );

  const holdingsDistributionOption = useMemo(
    () =>
      buildHorizontalBarOption({
        items: holdingsDistributionData,
        theme,
        isMobile,
        metric: 'grossProfit',
      }),
    [holdingsDistributionData, theme, isMobile]
  );

  const deductionsDonutOption = useMemo(
    () =>
      buildDonutOption({
        data: deductionsBreakdown,
        centerValue: formatINR(totalDeductions),
        centerLabel: 'Total deductions',
        theme,
      }),
    [deductionsBreakdown, theme, totalDeductions]
  );

  const winLossOption = useMemo(
    () =>
      buildDonutOption({
        data: winLossBreakdown,
        centerValue: `${winRate.toFixed(1)}%`,
        centerLabel: 'Win rate',
        theme,
      }),
    [theme, winLossBreakdown, winRate]
  );

  const holdingsAllocationOption = useMemo(
    () =>
      buildDonutOption({
        data: holdingsAllocationData,
        centerValue: formatINR(holdingStats.reduce((sum, holding) => sum + holding.costBasis, 0)),
        centerLabel: 'Open cost basis',
        theme,
      }),
    [holdingStats, holdingsAllocationData, theme]
  );

  const impactBridgeOption = useMemo(
    () => buildImpactBridgeOption(impactBridgeData, theme, isMobile),
    [impactBridgeData, theme, isMobile]
  );

  if (!hasWorkspace) {
    return (
      <AnalyticsEmptyState
        icon={<BarChart3 className="h-10 w-10 text-teal-500" />}
        title="Select a workspace to inspect analytics"
        description="Choose an audit workspace to explore pair performance, deductions, and holding concentration."
        primaryLabel="Open Workspaces"
        onPrimary={() => setCurrentView('workspaces')}
      />
    );
  }

  if (isLoading) {
    return <AnalyticsLoadingState />;
  }

  if (error) {
    return (
      <Card className="rounded-[28px] border border-red-200 bg-red-50/50 dark:border-red-800/30 dark:bg-red-950/20">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Unable to load analytics.</p>
            <p className="mt-1 text-xs leading-relaxed text-red-600/80 dark:text-red-400/70">{error}</p>
            <Button variant="outline" size="sm" onClick={loadAnalytics} className="mt-3 rounded-xl text-xs">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasUploads) {
    return (
      <AnalyticsEmptyState
        icon={<Upload className="h-10 w-10 text-teal-500" />}
        title="Upload CSV files to unlock analytics"
        description="Import your exchange CSVs first. After processing, this page will reveal profit trends, pair performance, deductions, and holding concentration."
        primaryLabel="Upload CSV"
        onPrimary={() => setCurrentView('upload')}
      />
    );
  }

  if (!hasAnalyticsData) {
    return (
      <AnalyticsEmptyState
        icon={isProcessing ? <RefreshCw className="h-10 w-10 animate-spin text-teal-500" /> : <Play className="h-10 w-10 text-teal-500" />}
        title={isProcessing ? 'Processing your analytics report...' : 'Process your trade report to unlock analytics'}
        description="The workspace has uploaded data, but no completed report is available yet for deep trade-performance analysis."
        primaryLabel={isProcessing ? 'Processing...' : 'Process Report'}
        onPrimary={handleProcessReport}
        primaryDisabled={isProcessing}
        secondaryLabel="Review uploads"
        onSecondary={() => setCurrentView('upload')}
      />
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            Report generated {formatRelativeTime(analytics.generatedAt)}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Deep trade performance intelligence for {activeWorkspace?.name || 'the current workspace'}.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAnalytics}
          disabled={isLoading}
          className="w-fit rounded-xl text-sm"
        >
          <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {isMobile ? (
        <MobileControlBar
          open={mobileFiltersOpen}
          onOpenChange={setMobileFiltersOpen}
          timeframe={timeframe}
          pairFilter={pairFilter}
          pairMetric={pairMetric}
          pairOptions={pairOptions}
          customStart={customStart}
          customEnd={customEnd}
          onTimeframeChange={setTimeframe}
          onPairChange={setPairFilter}
          onMetricChange={setPairMetric}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          onReset={handleResetFilters}
        />
      ) : (
        <DesktopControlBar
          timeframe={timeframe}
          pairFilter={pairFilter}
          pairMetric={pairMetric}
          pairOptions={pairOptions}
          customStart={customStart}
          customEnd={customEnd}
          onTimeframeChange={setTimeframe}
          onPairChange={setPairFilter}
          onMetricChange={setPairMetric}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          onReset={handleResetFilters}
        />
      )}

      {noFilteredData ? (
        <AnalyticsEmptyState
          icon={<BarChart3 className="h-10 w-10 text-orange-500" />}
          title="No analytics data available for the selected filters"
          description="Try a wider time frame or reset the pair filter to bring realized trade analytics back into view."
          primaryLabel="Reset Filters"
          onPrimary={handleResetFilters}
        />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <AnalyticsMetricCard
              title="Total Final Net Profit"
              value={formatINR(totals.finalNetProfit)}
              helper={`${pairScopeLabel} across ${rangeLabel}`}
              icon={<Wallet className="h-5 w-5" />}
              change={finalNetChange}
              tone={totals.finalNetProfit >= 0 ? 'positive' : 'negative'}
            />
            <AnalyticsMetricCard
              title="Total Gross Profit"
              value={formatINR(totals.grossProfit)}
              helper={`Before deductions. ${profitSurvivalRate.toFixed(1)}% survives into final net.`}
              icon={<TrendingUp className="h-5 w-5" />}
              change={grossChange}
              tone={totals.grossProfit >= 0 ? 'positive' : 'negative'}
            />
            <AnalyticsMetricCard
              title="Average Profit per Trade"
              value={formatINR(averageProfitPerTrade)}
              helper={`${totals.tradeCount} realized trades in the selected window.`}
              icon={<Calculator className="h-5 w-5" />}
              change={averageChange}
              tone={averageProfitPerTrade >= 0 ? 'positive' : 'negative'}
            />
            <AnalyticsMetricCard
              title="Win Rate"
              value={`${winRate.toFixed(1)}%`}
              helper={`${totals.wins} profitable vs ${totals.losses} loss trades.`}
              icon={<BadgePercent className="h-5 w-5" />}
              change={winRateChange}
              tone="positive"
            />
            <AnalyticsMetricCard
              title="Best Performing Pair"
              value={bestPair ? bestPair.pair : 'N/A'}
              helper={
                bestPair
                  ? `${formatINR(bestPair.finalNetProfit)}${bestPairShare !== null ? ` - ${bestPairShare.toFixed(1)}% of final net` : ''}`
                  : 'No profitable pair in this range.'
              }
              icon={<Trophy className="h-5 w-5" />}
              change={null}
              tone="neutral"
            />
            <AnalyticsMetricCard
              title="Total Deductions"
              value={formatINR(totalDeductions)}
              helper="Fees, GST on fees, TDS withheld, and direct tax combined."
              icon={<Landmark className="h-5 w-5" />}
              change={deductionChange}
              tone="tax"
            />
          </div>

          {isMobile ? (
            <div className="space-y-4">
              <ChartPanel
                title="Profit Over Time"
                subtitle={`Cumulative final net profit - ${getBucketModeLabel(timeframeRange.bucketMode)} buckets`}
              >
                <ReactECharts option={profitOverTimeOption} style={{ height: 270 }} />
              </ChartPanel>

              <ChartPanel
                title="Realized Profit Trend"
                subtitle="Positive and negative final net performance by time bucket"
              >
                <ReactECharts option={realizedTrendOption} style={{ height: 270 }} />
              </ChartPanel>

              <ChartPanel
                title={getPairMetricTitle(pairMetric)}
                subtitle={`Top contributors by ${getPairMetricSummary(pairMetric).toLowerCase()}`}
              >
                {topPairsByMetric.length ? (
                  <ReactECharts option={topPairsOption} style={{ height: 292 }} />
                ) : (
                  <SectionEmptyState
                    title="No pair ranking available"
                    description="The selected metric did not produce ranked pair results in this filter window."
                  />
                )}
              </ChartPanel>

              <ChartPanel
                title="Deductions Breakdown"
                subtitle="Fees, GST, withheld TDS, and direct tax impact"
              >
                {deductionsBreakdown.length ? (
                  <>
                    <ReactECharts option={deductionsDonutOption} style={{ height: 260 }} />
                    <LegendList items={deductionsBreakdown} totalLabel="Selected period total" />
                  </>
                ) : (
                  <SectionEmptyState
                    title="No deductions in this period"
                    description="This filter range has no fee, GST, TDS, or direct-tax deductions."
                  />
                )}
              </ChartPanel>

              <ChartPanel
                title="Win vs Loss Ratio"
                subtitle={`${totals.wins} of ${totals.tradeCount} realized trades finished positive`}
              >
                {winLossBreakdown.length ? (
                  <>
                    <ReactECharts option={winLossOption} style={{ height: 260 }} />
                    <div className="grid grid-cols-3 gap-3">
                      <InsightCard item={{ label: 'Profitable', value: `${totals.wins}`, helper: `${winRate.toFixed(1)}% of all realized trades`, tone: 'positive' }} />
                      <InsightCard item={{ label: 'Loss Trades', value: `${totals.losses}`, helper: `${lossRate.toFixed(1)}% of all realized trades`, tone: 'negative' }} />
                      <InsightCard item={{ label: 'Average Final Net', value: formatINR(averageProfitPerTrade), helper: 'Average across all realized trade outcomes', tone: averageProfitPerTrade >= 0 ? 'positive' : 'negative' }} />
                    </div>
                  </>
                ) : (
                  <SectionEmptyState
                    title="No realized trades"
                    description="Win-loss analysis appears once realized trades land inside the selected period."
                  />
                )}
              </ChartPanel>

              <ChartPanel
                title="Gross Profit vs Final Net Profit"
                subtitle="Visual bridge from raw gross performance to the final retained result"
              >
                <ReactECharts option={impactBridgeOption} style={{ height: 290 }} />
              </ChartPanel>

              <ChartPanel
                title="Open Holdings Allocation"
                subtitle="Current remaining cost basis by pair, based on the latest processed report"
              >
                {holdingsAllocationData.length ? (
                  <>
                    <ReactECharts option={holdingsAllocationOption} style={{ height: 260 }} />
                    <LegendList items={holdingsAllocationData} totalLabel="Current open cost basis" />
                  </>
                ) : (
                  <SectionEmptyState
                    title="No open holdings found"
                    description="All unmatched buy lots are currently cleared or no valid open positions were processed."
                  />
                )}
              </ChartPanel>

              <ChartPanel
                title="Trade Count by Pair"
                subtitle="Activity concentration by realized matched trade cycles"
              >
                {tradeCountByPair.length ? (
                  <ReactECharts option={tradeCountByPairOption} style={{ height: 292 }} />
                ) : (
                  <SectionEmptyState
                    title="No pair activity"
                    description="Trade-count analytics appear once realized trades exist in the selected window."
                  />
                )}
              </ChartPanel>
            </div>
          ) : (
            <div className="space-y-4">
              <section className="grid gap-4 lg:grid-cols-10">
                <ChartPanel
                  title="Profit Over Time"
                  subtitle={`Cumulative final net profit for ${pairScopeLabel.toLowerCase()} - ${getBucketModeLabel(timeframeRange.bucketMode)} buckets`}
                  className="lg:col-span-6"
                >
                  <ReactECharts option={profitOverTimeOption} style={{ height: 372 }} />
                </ChartPanel>

                <ChartPanel
                  title="Realized Profit Trend"
                  subtitle="Non-cumulative realized final net performance across the selected period"
                  className="lg:col-span-4"
                >
                  <ReactECharts option={realizedTrendOption} style={{ height: 372 }} />
                </ChartPanel>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <ChartPanel
                  title={getPairMetricTitle(pairMetric)}
                  subtitle={`Ranked by ${getPairMetricSummary(pairMetric).toLowerCase()} for ${pairScopeLabel.toLowerCase()}`}
                >
                  {topPairsByMetric.length ? (
                    <ReactECharts option={topPairsOption} style={{ height: 332 }} />
                  ) : (
                    <SectionEmptyState
                      title="No ranked pairs in this window"
                      description="Expand the range or switch the metric lens to reveal stronger pair-level ranking."
                    />
                  )}
                </ChartPanel>

                <ChartPanel
                  title="Top Loss-Making Pairs"
                  subtitle="Pairs with the lowest final net profit in the selected period"
                >
                  {lossPairs.length ? (
                    <ReactECharts option={lossPairsOption} style={{ height: 332 }} />
                  ) : (
                    <SectionEmptyState
                      title="No loss-making pairs in this period"
                      description="All selected realized pairs finished at break-even or better."
                    />
                  )}
                </ChartPanel>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <ChartPanel
                  title="Deductions Breakdown"
                  subtitle="Gross profit reduced by fees, GST, withheld TDS, and direct tax"
                >
                  {deductionsBreakdown.length ? (
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center">
                      <ReactECharts option={deductionsDonutOption} style={{ height: 272 }} />
                      <LegendList items={deductionsBreakdown} totalLabel="Selected period total" />
                    </div>
                  ) : (
                    <SectionEmptyState
                      title="No deductions in this range"
                      description="This filter window does not contain fee, GST, TDS, or direct-tax deductions."
                    />
                  )}
                </ChartPanel>

                <ChartPanel
                  title="Gross Profit vs Final Net Profit"
                  subtitle="Impact bridge from gross results through taxes, fees, and TDS credit"
                >
                  <ReactECharts option={impactBridgeOption} style={{ height: 272 }} />
                </ChartPanel>
              </section>

              <section className="grid gap-4 lg:grid-cols-3">
                <ChartPanel
                  title="Win vs Loss Ratio"
                  subtitle={`${totals.wins} of ${totals.tradeCount} realized trades ended positive`}
                >
                  {winLossBreakdown.length ? (
                    <>
                      <ReactECharts option={winLossOption} style={{ height: 238 }} />
                      <div className="grid grid-cols-2 gap-3">
                        <InsightCard item={{ label: 'Win Rate', value: `${winRate.toFixed(1)}%`, helper: `${totals.wins} profitable trades`, tone: 'positive' }} />
                        <InsightCard item={{ label: 'Loss Rate', value: `${lossRate.toFixed(1)}%`, helper: `${totals.losses} losing trades`, tone: 'negative' }} />
                      </div>
                    </>
                  ) : (
                    <SectionEmptyState
                      title="No win-loss split available"
                      description="This panel populates after realized trades land inside the selected filter window."
                    />
                  )}
                </ChartPanel>

                <ChartPanel
                  title="Average Trade Outcome"
                  subtitle="Understand quality, not just total result"
                >
                  <div className="grid gap-3">
                    <InsightCard
                      item={{
                        label: 'Average Winning Trade',
                        value: formatINR(averageWinningTrade),
                        helper: `${profitableTrades.length} profitable realized trades`,
                        tone: 'positive',
                      }}
                    />
                    <InsightCard
                      item={{
                        label: 'Average Losing Trade',
                        value: formatINR(averageLosingTrade),
                        helper: `${losingTrades.length} loss realized trades`,
                        tone: 'negative',
                      }}
                    />
                    <InsightCard
                      item={{
                        label: 'Average Final Net',
                        value: formatINR(averageProfitPerTrade),
                        helper: `${totals.tradeCount} realized trades in the current window`,
                        tone: averageProfitPerTrade >= 0 ? 'positive' : 'negative',
                      }}
                    />
                  </div>
                </ChartPanel>

                <ChartPanel
                  title="Trade Count by Pair"
                  subtitle="Activity intensity compared with actual result"
                >
                  {tradeCountByPair.length ? (
                    <ReactECharts option={tradeCountByPairOption} style={{ height: 318 }} />
                  ) : (
                    <SectionEmptyState
                      title="No trade-count ranking"
                      description="Pair activity appears once realized trade cycles exist in the selected window."
                    />
                  )}
                </ChartPanel>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <ChartPanel
                  title="Open Holdings Allocation"
                  subtitle="Current remaining cost basis by pair from the latest processed holdings snapshot"
                >
                  {holdingsAllocationData.length ? (
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center">
                      <ReactECharts option={holdingsAllocationOption} style={{ height: 272 }} />
                      <LegendList items={holdingsAllocationData} totalLabel="Current open cost basis" />
                    </div>
                  ) : (
                    <SectionEmptyState
                      title="No open holdings found"
                      description="There are no unmatched buy lots in the latest processed report."
                    />
                  )}
                </ChartPanel>

                <ChartPanel
                  title="Open Holdings Cost Distribution"
                  subtitle="Top open positions by remaining cost basis and quantity"
                >
                  {holdingsDistributionData.length ? (
                    <ReactECharts option={holdingsDistributionOption} style={{ height: 332 }} />
                  ) : (
                    <SectionEmptyState
                      title="No holdings cost distribution"
                      description="This panel appears once the workspace has unmatched open buy lots."
                    />
                  )}
                </ChartPanel>
              </section>

              {insights.length ? (
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {insights.map((item) => (
                    <InsightCard key={item.label} item={item} />
                  ))}
                </section>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
