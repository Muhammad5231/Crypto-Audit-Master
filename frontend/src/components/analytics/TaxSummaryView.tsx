'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  IndianRupee,
  Landmark,
  Percent,
  ShieldAlert,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  ArrowRightLeft,
  Info,
  Printer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAppStore } from '@/store/appStore';
import { reportApi } from '@/lib/api';
import { formatINR, getValueColor } from '@/lib/utils/format';
import { formatRelativeTime } from '@/lib/utils/dateUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────
interface ReportData {
  totalGrossProfit: string;
  totalFees: string;
  totalGst: string;
  totalTds: string;
  totalBaseTax: string;
  totalCess: string;
  totalDirectTax: string;
  totalNetProfit: string;
  totalFinalNet: string;
  generatedAt: string;
}

function safeNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function normalizeReportData(input: any): ReportData | null {
  if (!input) return null;

  const summary = input.summary || input;

  return {
    totalGrossProfit: String(summary.grossProfit ?? summary.totalGrossProfit ?? 0),
    totalFees: String(summary.totalFees ?? summary.fees ?? 0),
    totalGst: String(summary.gstOnFees ?? summary.gst ?? summary.totalGst ?? 0),
    totalTds: String(summary.tds ?? summary.totalTds ?? 0),
    totalBaseTax: String(summary.baseCryptoTax ?? summary.tax ?? summary.totalBaseTax ?? 0),
    totalCess: String(summary.cess ?? summary.totalCess ?? 0),
    totalDirectTax: String(summary.totalDirectTax ?? summary.totalTax ?? 0),
    totalNetProfit: String(
      summary.netProfitInHand ?? summary.netProfit ?? summary.totalNetProfit ?? 0
    ),
    totalFinalNet: String(summary.finalNetProfit ?? summary.totalFinalNet ?? 0),
    generatedAt: String(input.generatedAt || new Date().toISOString()),
  };
}

// ── Tax Stacked Bar Colors ─────────────────────────────────────────────
const TAX_BAR_COLORS: Record<string, string> = {
  'Base Tax': '#0d9488',
  'Cess': '#f97316',
  'GST on Fees': '#06b6d4',
  'TDS': '#ef4444',
};

// ── Custom Tooltip ──────────────────────────────────────────────────────
function TaxTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-popover/95 backdrop-blur border shadow-lg px-3 py-2 text-xs">
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            ₹{Number(entry.value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Tax Line Item ───────────────────────────────────────────────────────
function TaxLine({
  label,
  value,
  icon: Icon,
  colorClass = 'text-foreground',
  indent = false,
  bold = false,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  colorClass?: string;
  indent?: boolean;
  bold?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${indent ? 'pl-6' : ''}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
        <p className={`text-sm truncate ${bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
          {label}
        </p>
      </div>
      <p className={`text-sm font-semibold ml-4 whitespace-nowrap ${colorClass}`}>
        {value}
      </p>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export function TaxSummaryView() {
  const { activeWorkspace } = useWorkspaceStore();
  const { setCurrentView } = useAppStore();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = activeWorkspace?.id || (activeWorkspace as any)?._id;

  const fetchReport = useCallback(async () => {
    if (!workspaceId) {
      setReport(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await reportApi.getReport(workspaceId);
      const r = result.report || result;
      setReport(normalizeReportData(r));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load report';
      if (message.includes('404') || message.toLowerCase().includes('no completed report')) {
        setReport(null);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const hasData = report !== null;

  // Derived calculations
  const grossProfit = report ? safeNumber(report.totalGrossProfit) : 0;
  const fees = report ? safeNumber(report.totalFees) : 0;
  const gstOnFees = report ? safeNumber(report.totalGst) : 0;
  const tds = report ? safeNumber(report.totalTds) : 0;
  const baseTax = report ? safeNumber(report.totalBaseTax) : 0;
  const cess = report ? safeNumber(report.totalCess) : 0;
  const totalDirectTax = report ? safeNumber(report.totalDirectTax) : 0;
  const netProfit = report ? safeNumber(report.totalNetProfit) : 0;
  const finalNet = report ? safeNumber(report.totalFinalNet) : 0;

  // Tax breakdown bar data
  const taxBreakdownData = hasData
    ? [
        { name: 'Base Tax', value: Math.abs(baseTax) },
        { name: 'Cess', value: Math.abs(cess) },
        { name: 'GST on Fees', value: Math.abs(gstOnFees) },
        { name: 'TDS', value: Math.abs(tds) },
      ].filter((d) => d.value > 0)
    : [];

  const totalTaxBurden = taxBreakdownData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tax Summary</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeWorkspace
              ? `${activeWorkspace.name} — FY ${activeWorkspace.financialYear || '2024-2025'}`
              : 'Select a workspace to view tax summary'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasData && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl text-sm"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Report
            </Button>
          )}
          {hasData && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReport}
              disabled={isLoading}
              className="rounded-xl text-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView('export')}
            className="rounded-xl text-sm"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Generated info */}
      {hasData && report.generatedAt && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span>Report generated {formatRelativeTime(report.generatedAt)}</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasData && !error && (
        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500/10 to-teal-500/10 mb-6">
              <Receipt className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Tax Report</h3>
            <p className="text-sm text-muted-foreground max-w-[360px] mb-6">
              Process your trades first to generate a comprehensive tax summary with all deductions and liabilities.
            </p>
            <Button
              onClick={() => setCurrentView('upload')}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
            >
              Go to Upload
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <Card className="rounded-2xl border border-red-200 bg-red-50/50 dark:border-red-800/30 dark:bg-red-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load report</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchReport} className="mt-3 text-xs">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[500px] w-full rounded-2xl" />
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        </>
      )}

      {/* ── Tax Summary Data ──────────────────────────────────────────── */}
      {hasData && report && (
        <>
          {/* Overall Summary Card */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                  <Receipt className="h-4 w-4 text-teal-600" />
                </div>
                Tax Computation Summary
                <Badge variant="secondary" className="ml-auto text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 font-normal">
                  FY {activeWorkspace?.financialYear || '2024-2025'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Income Section */}
              <div className="mb-1">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 px-1">
                  Income
                </p>
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
                  <TaxLine
                    label="Total Gross Profit"
                    value={formatINR(grossProfit)}
                    icon={TrendingUp}
                    colorClass="text-emerald-600"
                    bold
                  />
                </div>
              </div>

              {/* Deductions Section */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 px-1">
                  Deductions
                </p>
                <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-3 space-y-0">
                  <TaxLine
                    label="Total Exchange Fees"
                    value={`−${formatINR(fees)}`}
                    icon={Receipt}
                    colorClass="text-red-500"
                  />
                  <Separator className="my-1 bg-red-200/30 dark:bg-red-800/20" />
                  <TaxLine
                    label="GST on Fees (18%)"
                    value={`−${formatINR(gstOnFees)}`}
                    icon={Percent}
                    colorClass="text-red-500"
                    indent
                  />
                </div>
              </div>

              {/* Tax Computation */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-2 px-1">
                  Tax Computation
                </p>
                <div className="rounded-xl bg-orange-500/5 border border-orange-500/10 p-3 space-y-0">
                  <TaxLine
                    label="Taxable Income (Gross − Fees − GST)"
                    value={formatINR(grossProfit - fees - gstOnFees)}
                    icon={IndianRupee}
                    colorClass={getValueColor(String(grossProfit - fees - gstOnFees))}
                    bold
                  />
                  <Separator className="my-1 bg-orange-200/30 dark:bg-orange-800/20" />
                  <TaxLine
                    label="Base Crypto Tax (30%)"
                    value={`−${formatINR(baseTax)}`}
                    icon={Landmark}
                    colorClass="text-orange-600"
                    indent
                  />
                  <Separator className="my-1 bg-orange-200/30 dark:bg-orange-800/20" />
                  <TaxLine
                    label="Health & Education Cess (4%)"
                    value={`−${formatINR(cess)}`}
                    icon={ShieldAlert}
                    colorClass="text-orange-600"
                    indent
                  />
                  <Separator className="my-1 bg-orange-200/30 dark:bg-orange-800/20" />
                  <TaxLine
                    label="Total Direct Tax"
                    value={`−${formatINR(totalDirectTax)}`}
                    colorClass="text-orange-600 font-bold"
                    indent
                    bold
                  />
                </div>
              </div>

              {/* TDS & Final */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  TDS & Final
                </p>
                <div className="rounded-xl bg-muted/50 border p-3 space-y-0">
                  <TaxLine
                    label="TDS Withheld (1%)"
                    value={`−${formatINR(tds)}`}
                    icon={Landmark}
                    colorClass="text-muted-foreground"
                  />
                  <Separator className="my-1" />
                  <TaxLine
                    label="Net Profit in Hand"
                    value={formatINR(netProfit)}
                    colorClass={getValueColor(String(netProfit))}
                    bold
                  />
                  <Separator className="my-1" />
                  <TaxLine
                    label="Final Net Profit (with TDS credit)"
                    value={formatINR(finalNet)}
                    icon={IndianRupee}
                    colorClass={getValueColor(String(finalNet))}
                    bold
                  />
                </div>
              </div>

              {/* Summary Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-medium">Gross Profit</p>
                  <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatINR(grossProfit)}
                  </p>
                </div>
                <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-orange-600 font-medium">Total Tax</p>
                  <p className="text-base font-bold text-orange-700 dark:text-orange-400 mt-1">
                    {formatINR(totalDirectTax)}
                  </p>
                </div>
                <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-cyan-600 font-medium">TDS Credit</p>
                  <p className="text-base font-bold text-cyan-700 dark:text-cyan-400 mt-1">
                    {formatINR(tds)}
                  </p>
                </div>
                <div className={`rounded-xl border p-3 text-center ${
                  finalNet >= 0
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <p className={`text-[10px] uppercase tracking-wider font-medium ${
                    finalNet >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    Final Net
                  </p>
                  <p className={`text-base font-bold mt-1 ${
                    finalNet >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatINR(finalNet)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Breakdown Visual */}
          {taxBreakdownData.length > 0 && (
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                    <Percent className="h-4 w-4 text-orange-500" />
                  </div>
                  Tax Liability Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[{ name: 'Total Tax', ...Object.fromEntries(taxBreakdownData.map(d => [d.name, d.value])) }]} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip content={<TaxTooltip />} />
                    <Bar dataKey="Base Tax" stackId="tax" fill={TAX_BAR_COLORS['Base Tax']} radius={0} maxBarSize={80} />
                    <Bar dataKey="Cess" stackId="tax" fill={TAX_BAR_COLORS['Cess']} radius={0} maxBarSize={80} />
                    <Bar dataKey="GST on Fees" stackId="tax" fill={TAX_BAR_COLORS['GST on Fees']} radius={0} maxBarSize={80} />
                    <Bar dataKey="TDS" stackId="tax" fill={TAX_BAR_COLORS['TDS']} radius={[6, 6, 0, 0]} maxBarSize={80} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {taxBreakdownData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-3 w-3 rounded-sm shrink-0"
                        style={{ backgroundColor: TAX_BAR_COLORS[entry.name] }}
                      />
                      <span className="text-muted-foreground truncate">{entry.name}</span>
                      <span className="ml-auto font-medium text-foreground whitespace-nowrap">
                        {formatINR(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t text-sm flex items-center justify-between">
                  <span className="text-muted-foreground">Total Tax Burden</span>
                  <span className="font-bold text-orange-600">{formatINR(totalTaxBurden)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer Banner */}
          <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 mt-0.5">
                <Info className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Disclaimer
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-1 leading-relaxed">
                  This tool is for operational review and audit visibility only. It does not replace professional tax advice.
                  Tax rates are based on Indian crypto taxation rules (30% flat + 4% cess). Consult a qualified chartered
                  accountant for accurate tax filing.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
