import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
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
} from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  IndianRupee,
  Info,
  Landmark,
  Loader2,
  Receipt,
  ShieldAlert,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAppStore } from "@/store/appStore";
import { reportApi, uploadApi } from "@/lib/api";
import { formatINR, formatQuantity, getValueColor } from "@/lib/utils/format";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type TimeframeKey = "7d" | "30d" | "90d" | "6m" | "1y" | "all";
type BucketMode = "day" | "week" | "month" | "quarter";
type PairMetric = "finalNetProfit" | "grossProfit" | "tradeCount";

interface DashboardTrade {
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
  netProfit?: string;
  finalNetProfit: string;
  exchangeName?: string;
}

interface DashboardHolding {
  pair: string;
  remainingQty: string;
  avgBuyPrice?: string;
  averageBuyPrice?: string;
  totalBuyValue?: string;
  investedValue?: string;
  sourceCount?: number;
}

interface DashboardUpload {
  filename?: string;
  exchangeName?: string;
  parsedCount?: number;
  skippedCount?: number;
  filteredByStatus?: number;
  warnings?: string[];
  createdAt?: string;
  uploadedAt?: string;
  updatedAt?: string;
}

interface MetricTotals {
  finalNetProfit: number;
  grossProfit: number;
  totalFees: number;
  totalDirectTax: number;
  tds: number;
  baseTax: number;
  cess: number;
  gst: number;
  buyValue: number;
  sellValue: number;
  tradeCount: number;
}

interface BucketPoint {
  key: string;
  label: string;
  tooltipLabel: string;
  date: Date;
  periodProfit: number;
  cumulativeProfit: number;
  grossProfit: number;
  tradeCount: number;
}

interface DashboardAlert {
  tone: "success" | "warning" | "info";
  title: string;
  detail: string;
  actionLabel?: string;
  actionView?: string;
}

interface DashboardAlertSummary {
  skippedRows: number;
  unmatchedSells: number;
  duplicateFiles: number;
  items: DashboardAlert[];
}

interface PairAggregate {
  pair: string;
  finalNetProfit: number;
  grossProfit: number;
  tradeCount: number;
}

const TIMEFRAME_OPTIONS: Array<{ key: TimeframeKey; label: string; shortLabel: string }> = [
  { key: "7d", label: "7 Days", shortLabel: "7D" },
  { key: "30d", label: "30 Days", shortLabel: "30D" },
  { key: "90d", label: "90 Days", shortLabel: "90D" },
  { key: "6m", label: "6 Months", shortLabel: "6M" },
  { key: "1y", label: "1 Year", shortLabel: "1Y" },
  { key: "all", label: "All Time", shortLabel: "All" },
];

const PROCESSING_MESSAGES = [
  "Running FIFO matching...",
  "Calculating taxes...",
  "Building dashboard summary...",
];

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function compactINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getWorkspaceId(workspace: any) {
  return workspace?.id || workspace?._id || "";
}

function getTradeDate(trade: DashboardTrade): Date | null {
  const date = new Date(trade.sellDate || trade.buyDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getLatestTradeDate(trades: DashboardTrade[]) {
  return trades.reduce<Date | null>((latest, trade) => {
    const date = getTradeDate(trade);
    if (!date) return latest;
    if (!latest || date > latest) return date;
    return latest;
  }, null);
}

function getEarliestTradeDate(trades: DashboardTrade[]) {
  return trades.reduce<Date | null>((earliest, trade) => {
    const date = getTradeDate(trade);
    if (!date) return earliest;
    if (!earliest || date < earliest) return date;
    return earliest;
  }, null);
}

function getBucketMode(key: TimeframeKey, trades: DashboardTrade[]): BucketMode {
  if (key === "7d" || key === "30d") return "day";
  if (key === "90d") return "week";
  if (key === "6m" || key === "1y") return "month";

  const latest = getLatestTradeDate(trades);
  const earliest = getEarliestTradeDate(trades);
  if (!latest || !earliest) return "day";

  const span = differenceInCalendarDays(latest, earliest);
  if (span <= 45) return "day";
  if (span <= 400) return "month";
  return "quarter";
}

function buildTimeframeRange(key: TimeframeKey, trades: DashboardTrade[]) {
  const latestTradeDate = getLatestTradeDate(trades) || new Date();
  const earliestTradeDate = getEarliestTradeDate(trades) || latestTradeDate;
  const end = endOfDay(latestTradeDate);
  const bucketMode = getBucketMode(key, trades);

  if (key === "all") {
    return {
      start: startOfDay(earliestTradeDate),
      end,
      bucketMode,
      previousStart: null as Date | null,
      previousEnd: null as Date | null,
    };
  }

  let start = startOfDay(latestTradeDate);
  let previousStart = startOfDay(latestTradeDate);
  let previousEnd = endOfDay(latestTradeDate);

  if (key === "7d") {
    start = startOfDay(subDays(end, 6));
    previousEnd = endOfDay(subDays(start, 1));
    previousStart = startOfDay(subDays(previousEnd, 6));
  } else if (key === "30d") {
    start = startOfDay(subDays(end, 29));
    previousEnd = endOfDay(subDays(start, 1));
    previousStart = startOfDay(subDays(previousEnd, 29));
  } else if (key === "90d") {
    start = startOfDay(subDays(end, 89));
    previousEnd = endOfDay(subDays(start, 1));
    previousStart = startOfDay(subDays(previousEnd, 89));
  } else if (key === "6m") {
    start = startOfDay(subMonths(end, 6));
    previousEnd = endOfDay(subDays(start, 1));
    previousStart = startOfDay(subMonths(previousEnd, 6));
  } else if (key === "1y") {
    start = startOfDay(subMonths(end, 12));
    previousEnd = endOfDay(subDays(start, 1));
    previousStart = startOfDay(subMonths(previousEnd, 12));
  }

  return {
    start,
    end,
    bucketMode,
    previousStart,
    previousEnd,
  };
}

function getBucketStart(date: Date, mode: BucketMode) {
  if (mode === "day") return startOfDay(date);
  if (mode === "week") return startOfWeek(date, { weekStartsOn: 1 });
  if (mode === "quarter") return startOfQuarter(date);
  return startOfMonth(date);
}

function getBucketEnd(date: Date, mode: BucketMode) {
  if (mode === "day") return endOfDay(date);
  if (mode === "week") return endOfWeek(date, { weekStartsOn: 1 });
  if (mode === "quarter") return endOfQuarter(date);
  return endOfMonth(date);
}

function advanceBucket(date: Date, mode: BucketMode) {
  if (mode === "day") return addDays(date, 1);
  if (mode === "week") return addWeeks(date, 1);
  if (mode === "quarter") return addQuarters(date, 1);
  return addMonths(date, 1);
}

function getBucketKey(date: Date, mode: BucketMode) {
  if (mode === "day") return formatDateValue(date, "yyyy-MM-dd");
  if (mode === "week") return formatDateValue(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  if (mode === "quarter") return `Q${Math.floor(date.getMonth() / 3) + 1}-${date.getFullYear()}`;
  return formatDateValue(startOfMonth(date), "yyyy-MM");
}

function getBucketLabel(date: Date, mode: BucketMode) {
  if (mode === "day") return formatDateValue(date, "dd MMM");
  if (mode === "week") return formatDateValue(startOfWeek(date, { weekStartsOn: 1 }), "dd MMM");
  if (mode === "quarter") return `Q${Math.floor(date.getMonth() / 3) + 1} ${formatDateValue(date, "yy")}`;
  return formatDateValue(date, "MMM yy");
}

function getBucketTooltipLabel(date: Date, mode: BucketMode) {
  if (mode === "day") return formatDateValue(date, "dd MMM yyyy");

  if (mode === "week") {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return `${formatDateValue(start, "dd MMM")} - ${formatDateValue(end, "dd MMM yyyy")}`;
  }

  if (mode === "quarter") {
    return `Q${Math.floor(date.getMonth() / 3) + 1} ${formatDateValue(date, "yyyy")}`;
  }

  return formatDateValue(date, "MMMM yyyy");
}

function getAxisLabelInterval(totalBuckets: number, mode: BucketMode, isMobile: boolean) {
  if (totalBuckets <= (isMobile ? 6 : 8)) return 0;
  if (mode === "day") return totalBuckets > 24 ? (isMobile ? 5 : 3) : (isMobile ? 3 : 1);
  if (mode === "week") return totalBuckets > 10 ? 1 : 0;
  if (mode === "month") return totalBuckets > 8 ? 1 : 0;
  return 0;
}

function sumTradeMetrics(trades: DashboardTrade[]): MetricTotals {
  return trades.reduce(
    (acc, trade) => ({
      finalNetProfit: acc.finalNetProfit + toNumber(trade.finalNetProfit),
      grossProfit: acc.grossProfit + toNumber(trade.grossProfit),
      totalFees: acc.totalFees + toNumber(trade.totalFees),
      totalDirectTax: acc.totalDirectTax + toNumber(trade.totalDirectTax),
      tds: acc.tds + toNumber(trade.tds),
      baseTax: acc.baseTax + toNumber(trade.baseCryptoTax ?? trade.tax ?? 0),
      cess: acc.cess + toNumber(trade.cess),
      gst: acc.gst + toNumber(trade.gstOnFees),
      buyValue: acc.buyValue + toNumber(trade.buyValue),
      sellValue: acc.sellValue + toNumber(trade.sellValue),
      tradeCount: acc.tradeCount + 1,
    }),
    {
      finalNetProfit: 0,
      grossProfit: 0,
      totalFees: 0,
      totalDirectTax: 0,
      tds: 0,
      baseTax: 0,
      cess: 0,
      gst: 0,
      buyValue: 0,
      sellValue: 0,
      tradeCount: 0,
    }
  );
}

function getChangePercent(currentValue: number, previousValue: number) {
  if (Math.abs(previousValue) < 0.0001) return null;
  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
}

function filterTradesByRange(trades: DashboardTrade[], start: Date, end: Date) {
  return trades.filter((trade) => {
    const date = getTradeDate(trade);
    return date ? isWithinInterval(date, { start, end }) : false;
  });
}

function buildProfitBuckets(
  trades: DashboardTrade[],
  start: Date,
  end: Date,
  mode: BucketMode
): BucketPoint[] {
  const bucketMap = new Map<string, BucketPoint>();
  let cursor = getBucketStart(start, mode);

  while (cursor <= end) {
    const key = getBucketKey(cursor, mode);
    bucketMap.set(key, {
      key,
      label: getBucketLabel(cursor, mode),
      tooltipLabel: getBucketTooltipLabel(cursor, mode),
      date: new Date(cursor),
      periodProfit: 0,
      cumulativeProfit: 0,
      grossProfit: 0,
      tradeCount: 0,
    });
    cursor = advanceBucket(cursor, mode);
  }

  trades.forEach((trade) => {
    const date = getTradeDate(trade);
    if (!date || !isWithinInterval(date, { start, end })) return;

    const bucketKey = getBucketKey(date, mode);
    const current = bucketMap.get(bucketKey);
    if (!current) return;

    current.periodProfit += toNumber(trade.finalNetProfit);
    current.grossProfit += toNumber(trade.grossProfit);
    current.tradeCount += 1;
  });

  let cumulativeProfit = 0;
  return Array.from(bucketMap.values()).map((point) => {
    cumulativeProfit += point.periodProfit;
    return {
      ...point,
      cumulativeProfit,
    };
  });
}

function buildPairPerformance(trades: DashboardTrade[]): PairAggregate[] {
  const pairMap = new Map<string, PairAggregate>();

  trades.forEach((trade) => {
    const pair = String(trade.pair || "UNKNOWN").toUpperCase();
    const current = pairMap.get(pair) || {
      pair,
      finalNetProfit: 0,
      grossProfit: 0,
      tradeCount: 0,
    };

    current.finalNetProfit += toNumber(trade.finalNetProfit);
    current.grossProfit += toNumber(trade.grossProfit);
    current.tradeCount += 1;
    pairMap.set(pair, current);
  });

  return Array.from(pairMap.values());
}

function getPairMetricValue(item: PairAggregate, metric: PairMetric) {
  if (metric === "tradeCount") return item.tradeCount;
  if (metric === "grossProfit") return item.grossProfit;
  return item.finalNetProfit;
}

function normalizeHoldingValue(holding: DashboardHolding) {
  return toNumber(holding.totalBuyValue ?? holding.investedValue);
}

function normalizeHoldingPrice(holding: DashboardHolding) {
  return toNumber(holding.avgBuyPrice ?? holding.averageBuyPrice ?? 0);
}

function extractCountFromMessage(message: string) {
  const match = String(message).match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function sumWarningsByPattern(messages: string[], pattern: RegExp) {
  return messages
    .filter((message) => pattern.test(String(message)))
    .reduce((sum, message) => sum + extractCountFromMessage(String(message)), 0);
}

function buildAlerts(
  uploads: DashboardUpload[],
  reportWarnings: string[],
  hasAuditData: boolean
): DashboardAlertSummary {
  const skippedRows = uploads.reduce((sum, upload) => sum + toNumber(upload.skippedCount), 0);
  const filteredStatuses = uploads.reduce((sum, upload) => sum + toNumber(upload.filteredByStatus), 0);
  const uploadWarnings = uploads.flatMap((upload) => upload.warnings || []);
  const duplicateFileCount = sumWarningsByPattern([...uploadWarnings, ...reportWarnings], /duplicate/i);
  const unmatchedSellCount = sumWarningsByPattern(reportWarnings, /unmatched sell/i);
  const parseWarningCount = uploadWarnings.filter((warning) =>
    /parse error|could not parse date|malformed|no headers|no valid trade rows/i.test(warning)
  ).length;

  const items: DashboardAlert[] = [];

  if (skippedRows > 0) {
    items.push({
      tone: "warning",
      title: `${skippedRows} rows skipped`,
      detail: "Incomplete CSV rows were ignored during import.",
      actionLabel: "View uploads",
      actionView: "upload",
    });
  }

  if (filteredStatuses > 0) {
    items.push({
      tone: "info",
      title: `${filteredStatuses} rows filtered by unmapped status`,
      detail: "Some exchange rows were excluded because their status could not be mapped.",
      actionLabel: "Review files",
      actionView: "upload",
    });
  }

  if (parseWarningCount > 0) {
    items.push({
      tone: "warning",
      title: `${parseWarningCount} CSV format warnings`,
      detail: "Date parsing or header issues were detected in one or more uploads.",
      actionLabel: "Open uploads",
      actionView: "upload",
    });
  }

  if (unmatchedSellCount > 0) {
    items.push({
      tone: "warning",
      title: `${unmatchedSellCount} unmatched sells detected`,
      detail: "Some sell quantities could not be matched to prior buy lots in FIFO review.",
      actionLabel: "View trades",
      actionView: "realized-trades",
    });
  }

  if (duplicateFileCount > 0) {
    items.push({
      tone: "info",
      title: `${duplicateFileCount} duplicate CSV files ignored`,
      detail: "Duplicate uploads were blocked using file-hash checks before they affected your report.",
      actionLabel: "Review files",
      actionView: "upload",
    });
  }

  if (!items.length) {
    items.push({
      tone: hasAuditData ? "success" : "info",
      title: hasAuditData ? "No major data quality issues detected" : "Audit data pending",
      detail: hasAuditData
        ? "CSV rows, FIFO matching, and report calculations look stable in the current workspace."
        : "Upload and process trade data to populate quality checks.",
      actionLabel: hasAuditData ? "Review uploads" : "Upload CSV",
      actionView: "upload",
    });
  }

  return {
    skippedRows,
    unmatchedSells: unmatchedSellCount,
    duplicateFiles: duplicateFileCount,
    items: items.slice(0, 3),
  };
}

function buildCurrencyTooltip(theme: "light" | "dark", seriesName: string) {
  return {
    trigger: "axis",
    backgroundColor: theme === "dark" ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)",
    borderColor: theme === "dark" ? "rgba(148, 163, 184, 0.22)" : "rgba(15, 23, 42, 0.08)",
    textStyle: {
      color: theme === "dark" ? "#e2e8f0" : "#0f172a",
      fontFamily: "inherit",
    },
    padding: 12,
    formatter: (params: any) => {
      const item = Array.isArray(params) ? params[0] : params;
      return `
        <div style="font-size:12px;line-height:1.5">
          <div style="opacity:.72;margin-bottom:6px;">${item.axisValueLabel}</div>
          <div style="font-weight:600">${seriesName}: ${formatINR(item.value)}</div>
        </div>
      `;
    },
  };
}

function buildProfitOverTimeOption(
  buckets: BucketPoint[],
  theme: "light" | "dark",
  isMobile: boolean,
  mode: BucketMode
): EChartsOption {
  const interval = getAxisLabelInterval(buckets.length, mode, isMobile);
  return {
    animationDuration: 500,
    grid: {
      left: 14,
      right: 10,
      top: 20,
      bottom: 26,
      containLabel: true,
    },
    tooltip: {
      ...buildCurrencyTooltip(theme, "Final Net Profit"),
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const point = buckets[item.dataIndex];
        return `
          <div style="font-size:12px;line-height:1.5">
            <div style="opacity:.72;margin-bottom:6px;">${point?.tooltipLabel || item.axisValueLabel}</div>
            <div style="font-weight:600">Final Net Profit: ${formatINR(item.value)}</div>
          </div>
        `;
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: buckets.map((bucket) => bucket.label),
      axisLine: { lineStyle: { color: theme === "dark" ? "#1e293b" : "#dbe3ee" } },
      axisLabel: {
        color: theme === "dark" ? "#94a3b8" : "#64748b",
        fontSize: isMobile ? 10 : 11,
        interval,
      },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: theme === "dark" ? "#94a3b8" : "#64748b",
        formatter: (value: number) => compactINR(value),
        fontSize: isMobile ? 10 : 11,
      },
      splitLine: {
        lineStyle: {
          color: theme === "dark" ? "rgba(148,163,184,.12)" : "rgba(15,23,42,.08)",
        },
      },
    },
    series: [
      {
        name: "Final Net Profit",
        type: "line",
        smooth: 0.35,
        symbol: "circle",
        symbolSize: isMobile ? 7 : 8,
        data: buckets.map((bucket) => Number(bucket.cumulativeProfit.toFixed(2))),
        lineStyle: {
          width: 3,
          color: "#14b8a6",
        },
        itemStyle: {
          color: "#14b8a6",
          borderColor: theme === "dark" ? "#0f172a" : "#ffffff",
          borderWidth: 2,
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(20, 184, 166, 0.28)" },
              { offset: 1, color: "rgba(20, 184, 166, 0.02)" },
            ],
          },
        },
      },
    ],
  };
}

function buildSparklineOption(buckets: BucketPoint[]): EChartsOption {
  return {
    animation: false,
    grid: { left: 0, right: 0, top: 8, bottom: 0 },
    xAxis: {
      type: "category",
      data: buckets.map((bucket) => bucket.label),
      show: false,
      boundaryGap: false,
    },
    yAxis: { type: "value", show: false },
    series: [
      {
        type: "line",
        smooth: 0.45,
        symbol: "none",
        data: buckets.map((bucket) => Number(bucket.cumulativeProfit.toFixed(2))),
        lineStyle: { width: 2.5, color: "#14b8a6" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(20,184,166,.22)" },
              { offset: 1, color: "rgba(20,184,166,0)" },
            ],
          },
        },
      },
    ],
  };
}

function buildTrendOption(
  buckets: BucketPoint[],
  theme: "light" | "dark",
  isMobile: boolean,
  mode: BucketMode
): EChartsOption {
  const interval = getAxisLabelInterval(buckets.length, mode, isMobile);
  return {
    animationDuration: 500,
    grid: {
      left: 14,
      right: 10,
      top: 20,
      bottom: 26,
      containLabel: true,
    },
    tooltip: {
      ...buildCurrencyTooltip(theme, "Realized Profit"),
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const point = buckets[item.dataIndex];
        return `
          <div style="font-size:12px;line-height:1.5">
            <div style="opacity:.72;margin-bottom:6px;">${point?.tooltipLabel || item.axisValueLabel}</div>
            <div style="font-weight:600">Realized Profit: ${formatINR(item.value)}</div>
          </div>
        `;
      },
    },
    xAxis: {
      type: "category",
      data: buckets.map((bucket) => bucket.label),
      axisLine: { lineStyle: { color: theme === "dark" ? "#1e293b" : "#dbe3ee" } },
      axisLabel: {
        color: theme === "dark" ? "#94a3b8" : "#64748b",
        fontSize: isMobile ? 10 : 11,
        interval,
      },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: {
        show: true,
        lineStyle: {
          color: theme === "dark" ? "rgba(148,163,184,.28)" : "rgba(15,23,42,.16)",
        },
      },
      axisLabel: {
        color: theme === "dark" ? "#94a3b8" : "#64748b",
        formatter: (value: number) => compactINR(value),
        fontSize: isMobile ? 10 : 11,
      },
      splitLine: {
        lineStyle: {
          color: theme === "dark" ? "rgba(148,163,184,.12)" : "rgba(15,23,42,.08)",
        },
      },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: isMobile ? 18 : 26,
        data: buckets.map((bucket) => ({
          value: Number(bucket.periodProfit.toFixed(2)),
          itemStyle: {
            color: bucket.periodProfit >= 0 ? "#14b8a6" : "#f97316",
            borderRadius: bucket.periodProfit >= 0 ? [8, 8, 0, 0] : [0, 0, 8, 8],
          },
        })),
      },
    ],
  };
}

function buildPairOption(
  pairs: PairAggregate[],
  pairMetric: PairMetric,
  theme: "light" | "dark",
  isMobile: boolean,
  variant: "performance" | "holdings" = "performance"
): EChartsOption {
  const values = pairs.map((item) => getPairMetricValue(item, pairMetric));

  return {
    animationDuration: 500,
    grid: {
      left: isMobile ? 10 : 18,
      right: 12,
      top: 10,
      bottom: 16,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: theme === "dark" ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)",
      borderColor: theme === "dark" ? "rgba(148, 163, 184, 0.22)" : "rgba(15, 23, 42, 0.08)",
      textStyle: {
        color: theme === "dark" ? "#e2e8f0" : "#0f172a",
        fontFamily: "inherit",
      },
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const value =
          pairMetric === "tradeCount"
            ? `${item.value} trades`
            : formatINR(item.value);
        return `
          <div style="font-size:12px;line-height:1.5">
            <div style="opacity:.72;margin-bottom:6px;">${item.axisValueLabel}</div>
            <div style="font-weight:600">${value}</div>
          </div>
        `;
      },
    },
    xAxis: {
      type: "value",
      axisLabel: {
        color: theme === "dark" ? "#94a3b8" : "#64748b",
        formatter: (value: number) => (pairMetric === "tradeCount" ? `${value}` : compactINR(value)),
        fontSize: isMobile ? 10 : 11,
      },
      splitLine: {
        lineStyle: {
          color: theme === "dark" ? "rgba(148,163,184,.12)" : "rgba(15,23,42,.08)",
        },
      },
    },
    yAxis: {
      type: "category",
      data: pairs.map((item) => item.pair),
      axisLabel: {
        color: theme === "dark" ? "#cbd5e1" : "#334155",
        fontWeight: 600,
        fontSize: isMobile ? 10 : 11,
        width: isMobile ? 70 : 92,
        overflow: "truncate",
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: values.map((value, index) => ({
          value,
          itemStyle: {
            color:
              variant === "holdings"
                ? ["#14b8a6", "#0ea5e9", "#22c55e", "#38bdf8", "#2dd4bf"][index % 5]
                : pairMetric === "tradeCount"
                  ? "#0ea5e9"
                  : value >= 0
                    ? "#14b8a6"
                    : "#f97316",
            borderRadius: [0, 8, 8, 0],
          },
        })),
        label: {
          show: true,
          position: "right",
          formatter: ({ value }: { value: number }) =>
            pairMetric === "tradeCount" ? `${value}` : formatINR(value),
          color: theme === "dark" ? "#e2e8f0" : "#0f172a",
          fontSize: 10,
        },
        barMaxWidth: 18,
      },
    ],
  };
}

function buildDonutOption(
  data: Array<{ name: string; value: number; color: string }>,
  centerValue: string,
  centerLabel: string,
  theme: "light" | "dark"
): EChartsOption {
  return {
    tooltip: {
      trigger: "item",
      backgroundColor: theme === "dark" ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)",
      borderColor: theme === "dark" ? "rgba(148, 163, 184, 0.22)" : "rgba(15, 23, 42, 0.08)",
      textStyle: {
        color: theme === "dark" ? "#e2e8f0" : "#0f172a",
        fontFamily: "inherit",
      },
      formatter: (params: any) => `
        <div style="font-size:12px;line-height:1.5">
          <div style="opacity:.72;margin-bottom:6px;">${params.name}</div>
          <div style="font-weight:600">${formatINR(params.value)}</div>
        </div>
      `,
    },
    series: [
      {
        type: "pie",
        radius: ["58%", "78%"],
        center: ["50%", "50%"],
        data,
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: {
          borderWidth: 6,
          borderColor: theme === "dark" ? "#0f172a" : "#ffffff",
        },
      },
    ],
    graphic: [
      {
        type: "text",
        left: "center",
        top: "43%",
        style: {
          text: centerValue,
          textAlign: "center",
          fill: theme === "dark" ? "#f8fafc" : "#0f172a",
          fontSize: 16,
          fontWeight: 700,
        },
      },
      {
        type: "text",
        left: "center",
        top: "55%",
        style: {
          text: centerLabel,
          textAlign: "center",
          fill: theme === "dark" ? "#94a3b8" : "#64748b",
          fontSize: 11,
          fontWeight: 500,
        },
      },
    ],
  };
}

export function DashboardView() {
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const { setCurrentView, onCreateWorkspace } = useAppStore();
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();

  const workspaceId = getWorkspaceId(activeWorkspace);
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  const [timeframe, setTimeframe] = useState<TimeframeKey>("7d");
  const [pairMetric, setPairMetric] = useState<PairMetric>("finalNetProfit");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStepIndex, setProcessingStepIndex] = useState(0);
  const [analytics, setAnalytics] = useState<any>(null);
  const [uploads, setUploads] = useState<DashboardUpload[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!workspaceId) {
      setAnalytics(null);
      setUploads([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [analyticsResponse, uploadResponse] = await Promise.all([
        reportApi.getAnalytics(workspaceId),
        uploadApi.list(workspaceId),
      ]);

      setAnalytics(analyticsResponse || {});
      setUploads(Array.isArray(uploadResponse?.uploads) ? uploadResponse.uploads : []);
    } catch (err: any) {
      setError(err?.message || "Unable to load dashboard data.");
      setAnalytics(null);
      setUploads([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!isProcessing) {
      setProcessingStepIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setProcessingStepIndex((current) => (current + 1) % PROCESSING_MESSAGES.length);
    }, 1400);

    return () => window.clearInterval(interval);
  }, [isProcessing]);

  const handleProcessReport = useCallback(async () => {
    if (!workspaceId) return;

    setIsProcessing(true);
    try {
      const result = await reportApi.process(workspaceId);
      toast.success("Dashboard summary refreshed", {
        description: `${result.realizedCount || 0} realized trades and ${result.holdingsCount || 0} open holdings recalculated.`,
      });
      await loadDashboard();
    } catch (err: any) {
      toast.error("Process failed", {
        description: err?.message || "Unable to rebuild the dashboard summary.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [loadDashboard, workspaceId]);

  const realizedTrades = useMemo<DashboardTrade[]>(
    () => (Array.isArray(analytics?.realizedTrades) ? analytics.realizedTrades : []),
    [analytics?.realizedTrades]
  );

  const openHoldings = useMemo<DashboardHolding[]>(
    () => (Array.isArray(analytics?.openHoldings) ? analytics.openHoldings : []),
    [analytics?.openHoldings]
  );

  const reportWarnings = useMemo<string[]>(
    () => (Array.isArray(analytics?.warnings) ? analytics.warnings : []),
    [analytics?.warnings]
  );

  const overallSummary = analytics?.summary || {};

  const hasCsvUploads = uploads.length > 0;
  const uploadedTradeCount = uploads.reduce((sum, upload) => sum + toNumber(upload.parsedCount), 0);
  const openHoldingsCostBasis = openHoldings.reduce((sum, holding) => sum + normalizeHoldingValue(holding), 0);
  const openHoldingLotCount = openHoldings.reduce((sum, holding) => sum + toNumber(holding.sourceCount), 0);
  const hasAuditData =
    realizedTrades.length > 0 ||
    openHoldings.length > 0 ||
    toNumber(overallSummary.finalNetProfit ?? overallSummary.totalFinalNetProfit) !== 0 ||
    toNumber(overallSummary.grossProfit ?? overallSummary.totalGrossProfit) !== 0;

  const timeframeRange = useMemo(
    () => buildTimeframeRange(timeframe, realizedTrades),
    [timeframe, realizedTrades]
  );

  const timeframeTrades = useMemo(
    () => filterTradesByRange(realizedTrades, timeframeRange.start, timeframeRange.end),
    [realizedTrades, timeframeRange.end, timeframeRange.start]
  );

  const previousWindowTrades = useMemo(() => {
    if (!timeframeRange.previousStart || !timeframeRange.previousEnd) return [];
    return filterTradesByRange(realizedTrades, timeframeRange.previousStart, timeframeRange.previousEnd);
  }, [realizedTrades, timeframeRange.previousEnd, timeframeRange.previousStart]);

  const timeframeTotals = useMemo(() => sumTradeMetrics(timeframeTrades), [timeframeTrades]);
  const previousTotals = useMemo(() => sumTradeMetrics(previousWindowTrades), [previousWindowTrades]);

  const profitBuckets = useMemo(
    () => buildProfitBuckets(timeframeTrades, timeframeRange.start, timeframeRange.end, timeframeRange.bucketMode),
    [timeframeTrades, timeframeRange.bucketMode, timeframeRange.end, timeframeRange.start]
  );

  const pairPerformance = useMemo(() => {
    const grouped = buildPairPerformance(timeframeTrades);
    return grouped
      .sort((a, b) => Math.abs(getPairMetricValue(b, pairMetric)) - Math.abs(getPairMetricValue(a, pairMetric)))
      .slice(0, 5);
  }, [pairMetric, timeframeTrades]);

  const taxBreakdown = useMemo(
    () =>
      [
        { name: "Base Crypto Tax", value: Math.abs(timeframeTotals.baseTax), color: "#14b8a6" },
        { name: "Cess", value: Math.abs(timeframeTotals.cess), color: "#f97316" },
        { name: "TDS Withheld", value: Math.abs(timeframeTotals.tds), color: "#0ea5e9" },
      ].filter((item) => item.value > 0),
    [timeframeTotals.baseTax, timeframeTotals.cess, timeframeTotals.tds]
  );

  const holdingsByPair = useMemo(
    () =>
      [...openHoldings]
        .map((holding) => ({
          pair: String(holding.pair || "UNKNOWN").toUpperCase(),
          value: normalizeHoldingValue(holding),
          quantity: toNumber(holding.remainingQty),
          lots: toNumber(holding.sourceCount),
          avgBuyPrice: normalizeHoldingPrice(holding),
        }))
        .filter((holding) => holding.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [openHoldings]
  );

  const recentTrades = useMemo(
    () =>
      [...timeframeTrades]
        .sort((a, b) => (getTradeDate(b)?.getTime() || 0) - (getTradeDate(a)?.getTime() || 0))
        .slice(0, isMobile ? 3 : 5),
    [isMobile, timeframeTrades]
  );

  const holdingsPreview = useMemo(
    () =>
      [...openHoldings]
        .sort((a, b) => normalizeHoldingValue(b) - normalizeHoldingValue(a))
        .slice(0, isMobile ? 3 : 4),
    [isMobile, openHoldings]
  );

  const alertSummary = useMemo(
    () => buildAlerts(uploads, reportWarnings, hasAuditData),
    [hasAuditData, reportWarnings, uploads]
  );

  const rangeLabel = useMemo(() => {
    if (!timeframeTrades.length) return "No realized trade activity in this range";
    return `${formatDateValue(timeframeRange.start, "dd MMM yyyy")} - ${formatDateValue(timeframeRange.end, "dd MMM yyyy")}`;
  }, [timeframeRange.end, timeframeRange.start, timeframeTrades.length]);

  const profitOverTimeOption = useMemo(
    () => buildProfitOverTimeOption(profitBuckets, theme, isMobile, timeframeRange.bucketMode),
    [isMobile, profitBuckets, theme, timeframeRange.bucketMode]
  );

  const sparklineOption = useMemo(
    () => buildSparklineOption(profitBuckets),
    [profitBuckets]
  );

  const realizedTrendOption = useMemo(
    () => buildTrendOption(profitBuckets, theme, isMobile, timeframeRange.bucketMode),
    [isMobile, profitBuckets, theme, timeframeRange.bucketMode]
  );

  const pairOption = useMemo(
    () => buildPairOption(pairPerformance, pairMetric, theme, isMobile),
    [isMobile, pairMetric, pairPerformance, theme]
  );

  const taxOption = useMemo(
    () =>
      buildDonutOption(
        taxBreakdown,
        formatINR(timeframeTotals.totalDirectTax + timeframeTotals.tds),
        "Tax + TDS",
        theme
      ),
    [taxBreakdown, theme, timeframeTotals.tds, timeframeTotals.totalDirectTax]
  );

  const holdingsOption = useMemo(
    () => buildPairOption(
      holdingsByPair.map((holding) => ({
        pair: holding.pair,
        finalNetProfit: holding.value,
        grossProfit: holding.value,
        tradeCount: holding.lots,
      })),
      "grossProfit",
      theme,
      isMobile,
      "holdings"
    ),
    [holdingsByPair, isMobile, theme]
  );

  const metricCards = useMemo(
    () => [
      {
        label: "Final Net Profit",
        value: timeframeTotals.finalNetProfit,
        icon: TrendingUp,
        tooltip: "Final Net Profit = Net Profit in Hand - Total Direct Tax + TDS",
        tone: timeframeTotals.finalNetProfit >= 0 ? "profit" : "loss",
        change: getChangePercent(timeframeTotals.finalNetProfit, previousTotals.finalNetProfit),
        helper: rangeLabel,
        hero: true,
      },
      {
        label: "Gross Profit",
        value: timeframeTotals.grossProfit,
        icon: IndianRupee,
        tooltip: "Gross Profit = Sell Value - Buy Value",
        tone: timeframeTotals.grossProfit >= 0 ? "profit" : "loss",
        change: getChangePercent(timeframeTotals.grossProfit, previousTotals.grossProfit),
        helper: "Before fees and taxes",
      },
      {
        label: "Total Fees",
        value: timeframeTotals.totalFees,
        icon: Receipt,
        tooltip: "CSV fees take priority; defaults are applied only when fee values are missing.",
        tone: "tax",
        change: getChangePercent(timeframeTotals.totalFees, previousTotals.totalFees),
        helper: "CSV + fallback settings used where needed",
      },
      {
        label: "Total Direct Tax",
        value: timeframeTotals.totalDirectTax,
        icon: Landmark,
        tooltip: "Total Direct Tax = Base Crypto Tax + 4% Cess",
        tone: "tax",
        change: getChangePercent(timeframeTotals.totalDirectTax, previousTotals.totalDirectTax),
        helper: "Base tax plus cess",
      },
      {
        label: "TDS Withheld",
        value: timeframeTotals.tds,
        icon: ShieldAlert,
        tooltip: "CSV TDS is used if present; otherwise 1% of sell value is applied as fallback.",
        tone: "tax",
        change: getChangePercent(timeframeTotals.tds, previousTotals.tds),
        helper: "Recoverable tax credit",
      },
      {
        label: "Open Holdings Cost Basis",
        value: openHoldingsCostBasis,
        icon: Wallet,
        tooltip: "Open Holdings represent unmatched buy lots remaining after FIFO matching.",
        tone: "default",
        change: null,
        helper: `${openHoldingLotCount} open lots in latest report`,
      },
    ],
    [
      openHoldingLotCount,
      openHoldingsCostBasis,
      previousTotals.finalNetProfit,
      previousTotals.grossProfit,
      previousTotals.tds,
      previousTotals.totalDirectTax,
      previousTotals.totalFees,
      rangeLabel,
      timeframeTotals.finalNetProfit,
      timeframeTotals.grossProfit,
      timeframeTotals.tds,
      timeframeTotals.totalDirectTax,
      timeframeTotals.totalFees,
    ]
  );

  if (!workspaceId) {
    return (
      <DashboardEmptyState
        icon={<Wallet className="h-10 w-10 text-teal-500" />}
        title="Create your first audit workspace"
        description="Start by creating a workspace for your exchange records and tax review."
        primaryLabel="+ New Workspace"
        onPrimary={onCreateWorkspace}
      />
    );
  }

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  if (error) {
    return (
      <DashboardEmptyState
        icon={<AlertTriangle className="h-10 w-10 text-orange-500" />}
        title="Unable to load dashboard data."
        description={error}
        primaryLabel="Retry"
        onPrimary={loadDashboard}
      />
    );
  }

  if (!hasCsvUploads) {
    return (
      <DashboardEmptyState
        icon={<Upload className="h-10 w-10 text-teal-500" />}
        title={activeWorkspace?.name || "Workspace ready"}
        description="No trade CSV has been uploaded yet. We will validate, match FIFO trades, and generate your audit report."
        primaryLabel="Upload CSV"
        onPrimary={() => setCurrentView("upload")}
        footer={
          <div className="mt-6 grid gap-3 rounded-3xl border border-border/50 bg-muted/30 p-4 text-left sm:grid-cols-3">
            {["Upload CSV", "Process Report", "Review Dashboard"].map((step, index) => (
              <div key={step} className="rounded-2xl bg-background/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Step {index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{step}</p>
              </div>
            ))}
          </div>
        }
      />
    );
  }

  if (!hasAuditData && uploadedTradeCount > 0) {
    return (
      <DashboardEmptyState
        icon={isProcessing ? <Loader2 className="h-10 w-10 animate-spin text-teal-500" /> : <Database className="h-10 w-10 text-teal-500" />}
        title={isProcessing ? PROCESSING_MESSAGES[processingStepIndex] : "CSV uploaded. Process your report to generate FIFO analysis and tax review."}
        description="Your files are in the workspace, but the dashboard does not have usable realized or holding summaries yet."
        primaryLabel={isProcessing ? "Processing..." : "Process Report"}
        onPrimary={handleProcessReport}
        primaryDisabled={isProcessing}
        secondaryLabel="Review uploaded files"
        onSecondary={() => setCurrentView("upload")}
        footer={
          isProcessing ? (
            <div className="mx-auto mt-6 max-w-md">
              <Progress value={((processingStepIndex + 1) / PROCESSING_MESSAGES.length) * 100} className="h-2.5" />
            </div>
          ) : null
        }
      />
    );
  }

  return (
    <div className="space-y-3.5 pb-4">
      <section className="flex justify-start lg:justify-end">
        <TimeframeSelector
          value={timeframe}
          onChange={setTimeframe}
          isMobile={isMobile}
        />
      </section>

      {isMobile ? (
        <div className="space-y-4">
          <HeroMetricCard
            title={metricCards[0].label}
            value={metricCards[0].value}
            helper={metricCards[0].helper}
            change={metricCards[0].change}
            tooltip={metricCards[0].tooltip}
            sparklineOption={sparklineOption}
          />

          <div className="grid grid-cols-2 gap-3">
            {metricCards.slice(1).map((metric) => (
              <MetricOverviewCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                icon={<metric.icon className="h-4.5 w-4.5" />}
                tooltip={metric.tooltip}
                helper={metric.helper}
                change={metric.change}
                tone={metric.tone}
                compact
              />
            ))}
          </div>

          <AlertsPanel summary={alertSummary} onNavigate={setCurrentView} />

          <ChartShell
            title="Profit Over Time"
            subtitle={`Cumulative final net profit - ${rangeLabel}`}
          >
            <ReactECharts option={profitOverTimeOption} style={{ height: 248 }} />
          </ChartShell>

          <ChartShell
            title="Tax Breakdown"
            subtitle="Base tax, cess, and TDS withheld"
          >
            <ReactECharts option={taxOption} style={{ height: 238 }} />
            <LegendList items={taxBreakdown} totalLabel="Tax + TDS snapshot" />
          </ChartShell>

          <ChartShell
            title="Profit by Pair"
            subtitle="Top performing pairs in the selected window"
            action={
              <PairMetricSwitcher value={pairMetric} onChange={setPairMetric} mobile />
            }
          >
            {pairPerformance.length ? (
              <ReactECharts option={pairOption} style={{ height: 248 }} />
            ) : (
              <SectionEmptyState
                title="No pair activity in this range"
                description="Try a longer dashboard time frame to reveal pair-wise performance."
              />
            )}
          </ChartShell>

          <ChartShell
            title="Open Holdings by Pair"
            subtitle="Latest unmatched buy lots by cost basis"
          >
            {holdingsByPair.length ? (
              <ReactECharts option={holdingsOption} style={{ height: 248 }} />
            ) : (
              <SectionEmptyState
                title="No open holdings"
                description="All processed buy lots are currently matched with sell activity."
              />
            )}
          </ChartShell>

          <PreviewCard
            title="Recent Realized Trades"
            actionLabel="View All Trades"
            onAction={() => setCurrentView("realized-trades")}
          >
            {recentTrades.length ? (
              <div className="space-y-3">
                {recentTrades.map((trade, index) => (
                  <MobileTradePreview key={`${trade.pair}-${trade.sellDate}-${index}`} trade={trade} />
                ))}
              </div>
            ) : (
              <SectionEmptyState
                title="No trades in this time frame"
                description="Select a wider range to preview realized trade activity."
              />
            )}
          </PreviewCard>

          <PreviewCard
            title="Open Holdings"
            actionLabel="View All Holdings"
            onAction={() => setCurrentView("open-holdings")}
          >
            {holdingsPreview.length ? (
              <div className="space-y-3">
                {holdingsPreview.map((holding, index) => (
                  <MobileHoldingPreview key={`${holding.pair}-${index}`} holding={holding} />
                ))}
              </div>
            ) : (
              <SectionEmptyState
                title="No open holdings"
                description="There are no unmatched buy lots in the latest processed report."
              />
            )}
          </PreviewCard>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <HeroMetricCard
              title={metricCards[0].label}
              value={metricCards[0].value}
              helper={metricCards[0].helper}
              change={metricCards[0].change}
              tooltip={metricCards[0].tooltip}
              sparklineOption={sparklineOption}
              dense
            />

            {metricCards.slice(1).map((metric) => (
              <MetricOverviewCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                icon={<metric.icon className="h-4.5 w-4.5" />}
                tooltip={metric.tooltip}
                helper={metric.helper}
                change={metric.change}
                tone={metric.tone}
              />
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-10">
            <ChartShell
              title="Profit Over Time"
              subtitle={`Cumulative final net profit - ${rangeLabel}`}
              className="lg:col-span-6"
            >
              {profitBuckets.length ? (
                <ReactECharts option={profitOverTimeOption} style={{ height: 368 }} />
              ) : (
                <SectionEmptyState
                  title="No profit points in this range"
                  description="Try a longer time frame to see cumulative realized performance."
                />
              )}
            </ChartShell>

            <ChartShell
              title="Realized Profit Trend"
              subtitle={`Grouped by ${timeframeRange.bucketMode}`}
              className="lg:col-span-4"
            >
              {profitBuckets.length ? (
                <ReactECharts option={realizedTrendOption} style={{ height: 368 }} />
              ) : (
                <SectionEmptyState
                  title="No realized trend yet"
                  description="This chart will populate when trades land inside the selected time frame."
                />
              )}
            </ChartShell>

          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ChartShell
              title="Profit by Pair"
              subtitle="Top 5 pair contributors during the selected period"
              action={<PairMetricSwitcher value={pairMetric} onChange={setPairMetric} />}
            >
              {pairPerformance.length ? (
                <ReactECharts option={pairOption} style={{ height: 336 }} />
              ) : (
                <SectionEmptyState
                  title="No pair data in this window"
                  description="Pair analysis appears once realized trades fall inside the chosen range."
                />
              )}
            </ChartShell>

            <ChartShell
              title="Tax Breakdown"
              subtitle="Direct tax and withheld TDS for the selected period"
            >
              {taxBreakdown.length ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_210px] xl:items-center">
                  <ReactECharts option={taxOption} style={{ height: 260 }} />
                  <LegendList items={taxBreakdown} totalLabel="Selected period total" />
                </div>
              ) : (
                <SectionEmptyState
                  title="No tax entries in this range"
                  description="Tax breakdown will appear when realized trades generate taxable results."
                />
              )}
            </ChartShell>
          </section>

          <section className="grid items-start gap-4 lg:grid-cols-2">
            <ChartShell
              title="Open Holdings by Pair"
              subtitle="Latest open cost basis snapshot"
            >
              {holdingsByPair.length ? (
                <ReactECharts option={holdingsOption} style={{ height: 336 }} />
              ) : (
                <SectionEmptyState
                  title="No open holdings"
                  description="All currently processed buy lots are matched or no valid buys were imported."
                />
              )}
            </ChartShell>

            <AlertsPanel summary={alertSummary} onNavigate={setCurrentView} />
          </section>

          <section className="grid items-start gap-4 lg:grid-cols-10">
            <PreviewCard
              title="Recent Realized Trades"
              actionLabel="View All Trades"
              onAction={() => setCurrentView("realized-trades")}
              className="lg:col-span-6"
            >
              {recentTrades.length ? (
                <div className="overflow-hidden rounded-2xl border border-border/50">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-medium">Pair</th>
                        <th className="px-3 py-2.5 text-left font-medium">Sell Date</th>
                        <th className="px-3 py-2.5 text-right font-medium">Gross Profit</th>
                        <th className="px-3 py-2.5 text-right font-medium">Final Net Profit</th>
                        <th className="px-3 py-2.5 text-right font-medium">Holding Period</th>
                        <th className="px-3 py-2.5 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTrades.map((trade, index) => (
                        <tr
                          key={`${trade.pair}-${trade.sellDate}-${index}`}
                          className="cursor-pointer border-t border-border/50 transition-colors hover:bg-muted/30"
                          onClick={() => setCurrentView("realized-trades")}
                        >
                          <td className="px-3 py-2.5 font-semibold text-foreground">{trade.pair}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {formatDateValue(getTradeDate(trade) || new Date(), "dd MMM yyyy")}
                          </td>
                          <td className={cn("px-3 py-2.5 text-right font-semibold", getValueColor(trade.grossProfit))}>
                            {formatINR(trade.grossProfit)}
                          </td>
                          <td className={cn("px-3 py-2.5 text-right font-bold", getValueColor(trade.finalNetProfit))}>
                            {formatINR(trade.finalNetProfit)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">
                            {getHoldingPeriodLabel(trade.buyDate, trade.sellDate)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <StatusBadge positive={toNumber(trade.finalNetProfit) >= 0} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <SectionEmptyState
                  title="No realized trades in this time frame"
                  description="Increase the dashboard time frame to preview more trade matches."
                  compact
                />
              )}
            </PreviewCard>

            <PreviewCard
              title="Open Holdings"
              actionLabel="View All Holdings"
              onAction={() => setCurrentView("open-holdings")}
              className="lg:col-span-4"
            >
              {holdingsPreview.length ? (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/50 bg-muted/25 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Total Cost Basis</p>
                      <p className="mt-1 text-sm font-bold text-foreground">{formatINR(openHoldingsCostBasis)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/25 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Open Lots</p>
                      <p className="mt-1 text-sm font-bold text-foreground">{openHoldingLotCount}</p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-border/50">
                    <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-medium">Pair</th>
                        <th className="px-3 py-2.5 text-right font-medium">Remaining Qty</th>
                        <th className="px-3 py-2.5 text-right font-medium">Buy Price</th>
                        <th className="px-3 py-2.5 text-right font-medium">Cost Basis</th>
                        <th className="px-3 py-2.5 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdingsPreview.map((holding, index) => (
                        <tr
                          key={`${holding.pair}-${index}`}
                          className="cursor-pointer border-t border-border/50 transition-colors hover:bg-muted/30"
                          onClick={() => setCurrentView("open-holdings")}
                        >
                          <td className="px-3 py-2.5 font-semibold text-foreground">{holding.pair}</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">
                            {formatQuantity(holding.remainingQty, 4)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">
                            {formatINR(normalizeHoldingPrice(holding))}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-orange-500">
                            {formatINR(normalizeHoldingValue(holding))}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Badge variant="outline" className="text-xs">
                              {(holding.sourceCount || 1) > 1 ? "Grouped lots" : "Single lot"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <SectionEmptyState
                  title="No open holdings"
                  description="All available buy lots are currently matched or no buy trades were processed."
                  compact
                />
              )}
            </PreviewCard>
          </section>
        </div>
      )}
    </div>
  );
}

function TimeframeSelector({
  value,
  onChange,
  isMobile,
}: {
  value: TimeframeKey;
  onChange: (value: TimeframeKey) => void;
  isMobile: boolean;
}) {
  return (
    <div className="w-full overflow-x-auto lg:w-auto">
      <div className="inline-flex min-w-full items-center rounded-[20px] border border-border/60 bg-gradient-to-r from-card via-card to-muted/20 p-1.5 shadow-sm shadow-black/5 sm:min-w-0">
        {TIMEFRAME_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              "rounded-2xl px-3 py-2 text-sm font-medium transition-all sm:px-4",
              value === option.key
                ? "bg-teal-600 text-white shadow-sm shadow-teal-600/20"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              isMobile && "whitespace-nowrap"
            )}
          >
            {isMobile ? option.shortLabel : option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HeroMetricCard({
  title,
  value,
  helper,
  change,
  tooltip,
  sparklineOption,
  className,
  dense = false,
}: {
  title: string;
  value: number;
  helper: string;
  change: number | null;
  tooltip: string;
  sparklineOption: EChartsOption;
  className?: string;
  dense?: boolean;
}) {
  const isPositive = value >= 0;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-[26px] border shadow-lg shadow-black/10",
        isPositive
          ? "border-teal-500/20 bg-gradient-to-br from-teal-500/14 via-card to-emerald-500/8"
          : "border-orange-500/20 bg-gradient-to-br from-orange-500/12 via-card to-red-500/8",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl",
          isPositive ? "bg-teal-500/15" : "bg-orange-500/15"
        )}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_42%)]" />
      <CardContent className={cn("relative flex h-full flex-col", dense ? "min-h-[162px] gap-2.5 p-4" : "p-5 gap-5")}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <div className="flex items-start justify-between gap-4">
          <div className={cn("space-y-3", dense && "space-y-2")}>
            <div className="flex items-center gap-2">
              {dense ? (
                <span className={cn("h-2 w-2 rounded-full", isPositive ? "bg-emerald-500" : "bg-orange-500")} />
              ) : null}
              <p className={cn("font-semibold uppercase text-muted-foreground/95", dense ? "text-[10px] tracking-[0.18em]" : "text-[11px] tracking-[0.24em]")}>
                {title}
              </p>
              <InfoTooltip content={tooltip} />
            </div>

            <h2 className={cn(dense ? "text-[26px]" : "text-[38px]", "font-black leading-none tracking-[-0.03em]", isPositive ? "text-emerald-500" : "text-orange-500")}>
              {formatINR(value)}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge positive={isPositive} />
              <ChangePill change={change} highlight compact={dense} />
            </div>
          </div>

          <div className={cn(
            dense ? "flex h-10 w-10 items-center justify-center rounded-2xl border" : "flex h-12 w-12 items-center justify-center rounded-2xl border",
            isPositive ? "bg-teal-500/10 text-teal-500" : "bg-orange-500/10 text-orange-500"
          )}>
            <TrendingUp className={cn(dense ? "h-4.5 w-4.5" : "h-5 w-5")} />
          </div>
        </div>

        {dense ? (
          <>
            <p className="min-h-[32px] text-[11px] leading-4 text-muted-foreground/92">{helper}</p>
            <div className="mt-auto rounded-[16px] border border-white/10 bg-background/55 px-2 py-1">
              <ReactECharts option={sparklineOption} style={{ height: 36 }} />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_176px]">
              <div className="rounded-2xl border border-border/60 bg-background/35 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Selected Window</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-foreground/90">{helper}</p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/35 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Computation</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-foreground/90">
                  Net Profit in Hand - Direct Tax + TDS
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-background/45 p-2.5">
              <ReactECharts option={sparklineOption} style={{ height: 84 }} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MetricOverviewCard({
  label,
  value,
  icon,
  tooltip,
  helper,
  change,
  tone,
  compact = false,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tooltip: string;
  helper: string;
  change: number | null;
  tone: "profit" | "loss" | "tax" | "default";
  compact?: boolean;
}) {
  const toneClasses =
    tone === "profit"
      ? "bg-emerald-500/10 text-emerald-500"
      : tone === "loss"
        ? "bg-red-500/10 text-red-500"
        : tone === "tax"
          ? "bg-orange-500/10 text-orange-500"
          : "bg-sky-500/10 text-sky-500";

  const accentClasses =
    tone === "profit"
      ? "border-emerald-500/18"
      : tone === "loss"
        ? "border-red-500/18"
        : tone === "tax"
          ? "border-orange-500/18"
          : "border-sky-500/18";

  return (
    <Card className={cn("relative overflow-hidden rounded-[26px] border bg-gradient-to-br from-card via-card to-muted/[0.12] shadow-sm", accentClasses)}>
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-3xl",
          tone === "profit"
            ? "bg-emerald-500/12"
            : tone === "loss"
              ? "bg-red-500/12"
              : tone === "tax"
                ? "bg-orange-500/12"
                : "bg-sky-500/12"
        )}
      />
      <CardContent className={cn("relative flex min-h-[162px] flex-col gap-2.5 p-4", compact && "min-h-[148px] gap-2.5 p-3.5")}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/95">
                {label}
              </p>
              <InfoTooltip content={tooltip} />
            </div>
            <p className="text-[20px] font-black leading-none tracking-[-0.025em] text-foreground">
              {formatINR(value)}
            </p>
          </div>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/5", toneClasses)}>
            {icon}
          </div>
        </div>

        <p className="min-h-[2.25rem] text-[12px] leading-5 text-muted-foreground/92">{helper}</p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/50 pt-2.5">
          <ChangePill change={change} compact />
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {change === null ? "Latest report" : "Selected window"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ChangePill({
  change,
  highlight = false,
  compact = false,
}: {
  change: number | null;
  highlight?: boolean;
  compact?: boolean;
}) {
  if (change === null) {
    return (
      <span className="inline-flex rounded-full bg-muted/75 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        {compact ? "First window" : "First comparison window"}
      </span>
    );
  }

  const positive = change >= 0;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium",
        highlight
          ? positive
            ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
            : "bg-orange-500/12 text-orange-600 dark:text-orange-400"
          : "bg-muted text-muted-foreground"
      )}
    >
      {positive ? "+" : ""}
      {change.toFixed(1)}% {compact ? "vs prev" : "vs previous window"}
    </span>
  );
}

function ChartShell({
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
    <Card className={cn("relative overflow-hidden rounded-[28px] border-border/50 bg-gradient-to-br from-card via-card to-muted/15 shadow-sm", className)}>
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

function PairMetricSwitcher({
  value,
  onChange,
  mobile = false,
}: {
  value: PairMetric;
  onChange: (value: PairMetric) => void;
  mobile?: boolean;
}) {
  const options: Array<{ key: PairMetric; label: string }> = [
    { key: "finalNetProfit", label: mobile ? "Final" : "Final Net" },
    { key: "grossProfit", label: "Gross" },
    { key: "tradeCount", label: "Trades" },
  ];

  return (
    <div className="inline-flex rounded-2xl border border-border/50 bg-muted/35 p-1">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={cn(
            "rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
            value === option.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AlertsPanel({
  summary,
  onNavigate,
  className,
}: {
  summary: DashboardAlertSummary;
  onNavigate: (view: any) => void;
  className?: string;
}) {
  const alertItems = summary.items;

  return (
    <Card className={cn("relative overflow-hidden rounded-[28px] border-border/50 bg-gradient-to-br from-card via-card to-muted/15 shadow-sm", className)}>
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-orange-500/[0.05] blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
        <div>
          <CardTitle className="text-lg font-bold text-foreground">Alerts & Data Quality</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit exceptions, CSV quality signals, and import review prompts.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate("upload")}>
          View All
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2 lg:min-h-[336px]">
        <div className="grid grid-cols-3 gap-2">
          <AlertSummaryTile label="Skipped Rows" value={summary.skippedRows} tone={summary.skippedRows > 0 ? "warning" : "neutral"} />
          <AlertSummaryTile label="Unmatched Sells" value={summary.unmatchedSells} tone={summary.unmatchedSells > 0 ? "warning" : "neutral"} />
          <AlertSummaryTile label="Duplicate Files" value={summary.duplicateFiles} tone={summary.duplicateFiles > 0 ? "info" : "neutral"} />
        </div>

        {alertItems.map((alert, index) => (
          <button
            key={`${alert.title}-${index}`}
            type="button"
            onClick={() => alert.actionView && onNavigate(alert.actionView)}
            className={cn(
              "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
              alert.tone === "success"
                ? "border-emerald-500/20 bg-emerald-500/8"
                : alert.tone === "warning"
                  ? "border-orange-500/20 bg-orange-500/8"
                  : "border-sky-500/20 bg-sky-500/8"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                alert.tone === "success"
                  ? "bg-emerald-500/12 text-emerald-500"
                  : alert.tone === "warning"
                    ? "bg-orange-500/12 text-orange-500"
                    : "bg-sky-500/12 text-sky-500"
              )}
            >
              {alert.tone === "success" ? (
                <CheckCircle2 className="h-4.5 w-4.5" />
              ) : alert.tone === "warning" ? (
                <AlertTriangle className="h-4.5 w-4.5" />
              ) : (
                <Info className="h-4.5 w-4.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{alert.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{alert.detail}</p>
            </div>
            {alert.actionLabel ? (
              <div className="flex items-center gap-1 text-xs font-medium text-teal-500">
                {alert.actionLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            ) : null}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function AlertSummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "warning" | "info" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2.5",
        tone === "warning"
          ? "border-orange-500/20 bg-orange-500/8"
          : tone === "info"
            ? "border-sky-500/20 bg-sky-500/8"
            : "border-border/50 bg-muted/20"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black leading-none text-foreground">{value}</p>
    </div>
  );
}

function LegendList({
  items,
  totalLabel,
}: {
  items: Array<{ name: string; value: number; color: string }>;
  totalLabel: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const share = total ? (item.value / total) * 100 : 0;
        return (
          <div key={item.name} className="flex items-center gap-3 rounded-2xl bg-muted/30 px-3 py-2.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
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

function PreviewCard({
  title,
  actionLabel,
  onAction,
  className,
  children,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("relative overflow-hidden rounded-[28px] border-border/50 bg-gradient-to-br from-card via-card to-muted/15 shadow-sm", className)}>
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-teal-500/[0.05] blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
        <CardTitle className="text-lg font-bold text-foreground">{title}</CardTitle>
        <Button variant="ghost" size="sm" className="text-xs" onClick={onAction}>
          {actionLabel}
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-2">{children}</CardContent>
    </Card>
  );
}

function MobileTradePreview({ trade }: { trade: DashboardTrade }) {
  const finalNet = toNumber(trade.finalNetProfit);

  return (
    <div className="rounded-3xl border border-border/50 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{trade.pair}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sold {formatDateValue(getTradeDate(trade) || new Date(), "dd MMM yyyy")}
          </p>
        </div>
        <StatusBadge positive={finalNet >= 0} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Gross Profit</p>
          <p className={cn("mt-1 text-sm font-semibold", getValueColor(trade.grossProfit))}>
            {formatINR(trade.grossProfit)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Final Net</p>
          <p className={cn("mt-1 text-sm font-bold", getValueColor(trade.finalNetProfit))}>
            {formatINR(trade.finalNetProfit)}
          </p>
        </div>
      </div>
    </div>
  );
}

function MobileHoldingPreview({ holding }: { holding: DashboardHolding }) {
  return (
    <div className="rounded-3xl border border-border/50 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{holding.pair}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(holding.sourceCount || 1) > 1 ? `${holding.sourceCount} grouped lots` : "Single lot"}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Open
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Remaining Qty</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{formatQuantity(holding.remainingQty, 4)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Cost Basis</p>
          <p className="mt-1 text-sm font-bold text-orange-500">{formatINR(normalizeHoldingValue(holding))}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ positive }: { positive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
        positive
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
      )}
    >
      {positive ? "Profit" : "Loss"}
    </Badge>
  );
}

function getHoldingPeriodLabel(buyDate: string, sellDate: string) {
  const buy = new Date(buyDate);
  const sell = new Date(sellDate);
  if (Number.isNaN(buy.getTime()) || Number.isNaN(sell.getTime())) return "-";

  const days = Math.max(differenceInCalendarDays(sell, buy), 0);
  if (days === 0) return "Same day";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  return remainingDays === 0 ? `${months}m` : `${months}m ${remainingDays}d`;
}

function SectionEmptyState({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex h-full flex-col items-center justify-center text-center", compact ? "min-h-[140px]" : "min-h-[220px]")}>
      <BarChart3 className="h-9 w-9 text-muted-foreground/45" />
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function DashboardEmptyState({
  icon,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryDisabled,
  footer,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  primaryDisabled?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-3xl rounded-[34px] border-border/50 bg-card/85 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-500/10">
            {icon}
          </div>
          <h2 className="mt-6 text-3xl font-black tracking-tight text-foreground">{title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
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
          {footer}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-4 pb-4">
      <div className="flex justify-end">
        <Skeleton className="h-12 w-[360px] rounded-2xl" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Skeleton className="h-[162px] rounded-[26px]" />
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[162px] rounded-[26px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-10">
        <Skeleton className="h-[408px] rounded-[28px] lg:col-span-6" />
        <Skeleton className="h-[408px] rounded-[28px] lg:col-span-4" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[384px] rounded-[28px]" />
        <Skeleton className="h-[384px] rounded-[28px]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[384px] rounded-[28px]" />
        <Skeleton className="h-[384px] rounded-[28px]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-10">
        <Skeleton className="h-[320px] rounded-[28px] lg:col-span-6" />
        <Skeleton className="h-[264px] rounded-[28px] lg:col-span-4" />
      </div>
    </div>
  );
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="max-w-[260px] leading-relaxed">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
