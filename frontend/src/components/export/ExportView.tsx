'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Download,
  FileSpreadsheet,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  History,
  Info,
  ArrowRight,
  FileJson,
  Table2,
  FileCheck,
  BarChart3,
  Eye,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAppStore } from '@/store/appStore';
import { exportApi, reportApi } from '@/lib/api';
import { formatINR } from '@/lib/utils/format';
import { formatDateTime, formatRelativeTime } from '@/lib/utils/dateUtils';

interface ExportRecord {
  id: string;
  exportType: string;
  filename: string;
  generatedAt: string;
}

interface ReportPreview {
  totalRealizedTrades: number;
  totalBuyValue: string;
  totalSellValue: string;
  totalGrossProfit: string;
  generatedAt: string;
}

export function ExportView() {
  const { activeWorkspace } = useWorkspaceStore();
  const { setCurrentView } = useAppStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);
  const [reportPreview, setReportPreview] = useState<ReportPreview | null>(null);

  // Export options
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeTaxSummary, setIncludeTaxSummary] = useState(true);

  const workspaceId = activeWorkspace?.id;

  const fetchHistory = useCallback(async () => {
    if (!workspaceId) {
      setExportHistory([]);
      setIsLoadingHistory(false);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const result = await exportApi.getHistory(workspaceId);
      setExportHistory(result.history || []);
    } catch {
      setExportHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [workspaceId]);

  const fetchPreview = useCallback(async () => {
    if (!workspaceId) {
      setReportPreview(null);
      return;
    }
    try {
      const result = await reportApi.getAnalytics(workspaceId);
      const data = result.analytics || result;
      setReportPreview({
        totalRealizedTrades: data.totalRealizedTrades || 0,
        totalBuyValue: data.totalBuyValue || '0',
        totalSellValue: data.totalSellValue || '0',
        totalGrossProfit: data.totalGrossProfit || '0',
        generatedAt: data.generatedAt || '',
      });
    } catch {
      setReportPreview(null);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchHistory();
    fetchPreview();
  }, [fetchHistory, fetchPreview]);

  const handlePdfExport = async () => {
    if (!workspaceId) return;

    setIsPdfExporting(true);
    try {
      const blob = await exportApi.exportPdf(workspaceId, {
        includeHeaders,
        includeTaxSummary,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      const safeName = (activeWorkspace?.name || 'workspace').replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      );
      a.href = url;
      a.download = `crypto-audit-${safeName}-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('PDF exported successfully!', {
        description: 'Your PDF report has been downloaded.',
      });

      await fetchHistory();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'PDF export failed';
      toast.error(message);
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleExport = async () => {
    if (!workspaceId) return;

    setIsExporting(true);
    try {
      const blob = await exportApi.exportCsv(workspaceId, {
        includeHeaders,
        includeTaxSummary,
        format: exportFormat,
      });

      // Create download link and trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      const safeName = (activeWorkspace?.name || 'workspace').replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      );
      const ext = exportFormat === 'json' ? 'json' : 'csv';
      a.href = url;
      a.download = `crypto-audit-${safeName}-${dateStr}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Export successful!', {
        description: `Your ${exportFormat.toUpperCase()} report has been downloaded.`,
      });

      // Refresh export history
      await fetchHistory();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Export Report
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download your crypto audit report in your preferred format.
        </p>
      </div>

      {/* Export Preview Card */}
      {reportPreview && (
        <Card className="rounded-2xl border shadow-sm bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Export Preview
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Summary of data that will be included in your export
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl bg-muted/30 border border-border/40 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Realized Trades
                  </p>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {reportPreview.totalRealizedTrades.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-xl bg-muted/30 border border-border/40 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Report Date
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {reportPreview.generatedAt
                    ? formatDateTime(reportPreview.generatedAt)
                    : 'N/A'}
                </p>
              </div>
              <div className="rounded-xl bg-muted/30 border border-border/40 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Total Sell Value
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {formatINR(reportPreview.totalSellValue)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/30 border border-border/40 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Gross Profit
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold mt-1 ${
                    parseFloat(reportPreview.totalGrossProfit) >= 0
                      ? 'text-emerald-600'
                      : 'text-red-500'
                  }`}
                >
                  {formatINR(reportPreview.totalGrossProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Options Card */}
      <Card className="rounded-2xl border shadow-sm bg-gradient-to-br from-teal-500/5 via-card to-orange-500/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
              <Download className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            Export Options
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {activeWorkspace ? (
              <span>
                <span className="font-medium text-foreground">
                  {activeWorkspace.name}
                </span>{' '}
                &mdash; FY {activeWorkspace.financialYear || 'All Time'}
              </span>
            ) : (
              'Select a workspace to export'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Info Banner */}
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
            <Info className="h-5 w-5 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground leading-relaxed">
              Report includes realized trades, open holdings, tax summary, and
              warnings. Configure your export settings below.
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Export Format
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setExportFormat('csv')}
                className={`flex items-center gap-2 rounded-xl border p-3 px-4 transition-all cursor-pointer flex-1 max-w-[200px] ${
                  exportFormat === 'csv'
                    ? 'border-teal-500 bg-teal-500/5 shadow-sm'
                    : 'border-border hover:border-border/80 hover:bg-muted/30'
                }`}
              >
                <FileSpreadsheet
                  className={`h-5 w-5 ${
                    exportFormat === 'csv'
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-muted-foreground'
                  }`}
                />
                <div className="text-left">
                  <p
                    className={`text-sm font-medium ${
                      exportFormat === 'csv'
                        ? 'text-teal-700 dark:text-teal-300'
                        : 'text-foreground'
                    }`}
                  >
                    CSV
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Spreadsheet compatible
                  </p>
                </div>
                {exportFormat === 'csv' && (
                  <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 ml-auto" />
                )}
              </button>
              <button
                onClick={() => setExportFormat('json')}
                className={`flex items-center gap-2 rounded-xl border p-3 px-4 transition-all cursor-pointer flex-1 max-w-[180px] ${
                  exportFormat === 'json'
                    ? 'border-orange-500 bg-orange-500/5 shadow-sm'
                    : 'border-border hover:border-border/80 hover:bg-muted/30'
                }`}
              >
                <FileJson
                  className={`h-5 w-5 ${
                    exportFormat === 'json'
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-muted-foreground'
                  }`}
                />
                <div className="text-left">
                  <p
                    className={`text-sm font-medium ${
                      exportFormat === 'json'
                        ? 'text-orange-700 dark:text-orange-300'
                        : 'text-foreground'
                    }`}
                  >
                    JSON
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Structured data
                  </p>
                </div>
                {exportFormat === 'json' && (
                  <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400 ml-auto" />
                )}
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                className={`flex items-center gap-2 rounded-xl border p-3 px-4 transition-all cursor-pointer flex-1 max-w-[180px] ${
                  exportFormat === 'pdf'
                    ? 'border-rose-500 bg-rose-500/5 shadow-sm'
                    : 'border-border hover:border-border/80 hover:bg-muted/30'
                }`}
              >
                <FileText
                  className={`h-5 w-5 ${
                    exportFormat === 'pdf'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-muted-foreground'
                  }`}
                />
                <div className="text-left">
                  <p
                    className={`text-sm font-medium ${
                      exportFormat === 'pdf'
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-foreground'
                    }`}
                  >
                    PDF
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Printable report
                  </p>
                </div>
                {exportFormat === 'pdf' && (
                  <CheckCircle2 className="h-4 w-4 text-rose-600 dark:text-rose-400 ml-auto" />
                )}
              </button>
            </div>
          </div>

          <Separator className="my-1" />

          {/* Checkboxes */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="include-headers"
                checked={includeHeaders}
                onCheckedChange={(checked) =>
                  setIncludeHeaders(checked === true)
                }
                className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
              />
              <Label
                htmlFor="include-headers"
                className="text-sm text-foreground cursor-pointer"
              >
                Include Headers
              </Label>
            </div>
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="include-tax"
                checked={includeTaxSummary}
                onCheckedChange={(checked) =>
                  setIncludeTaxSummary(checked === true)
                }
                className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
              />
              <Label
                htmlFor="include-tax"
                className="text-sm text-foreground cursor-pointer"
              >
                Include Tax Summary
              </Label>
            </div>
          </div>

          {/* Sample Preview Table */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Sample Preview
            </p>
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Pair
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Buy Price
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Sell Price
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Gross P&L
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium text-foreground">
                        BTC/INR
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        Short
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        0.001
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        ₹52,50,000
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        ₹55,00,000
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-600">
                        +₹2,500
                      </td>
                    </tr>
                    <tr className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium text-foreground">
                        ETH/INR
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        Long
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        0.05
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        ₹2,80,000
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        ₹2,60,000
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-red-500">
                        -₹1,000
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              * Preview shows sample format — actual data will reflect your
              processed trades
            </p>
          </div>

          {/* Export Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {exportFormat === 'csv'
                  ? 'Download as CSV'
                  : exportFormat === 'json'
                  ? 'Download as JSON'
                  : 'Download as PDF'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {exportFormat === 'pdf'
                  ? 'Professional PDF report with tables, summary, and tax breakdown'
                  : 'Full audit report with FIFO-matched trades, fees, and tax calculations'}
              </p>
            </div>
            <Button
              onClick={exportFormat === 'pdf' ? handlePdfExport : handleExport}
              disabled={(exportFormat === 'pdf' ? isPdfExporting : isExporting) || !workspaceId}
              className={`rounded-xl px-6 min-w-[180px] shadow-lg disabled:opacity-50 ${
                exportFormat === 'pdf'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
              }`}
            >
              {(exportFormat === 'pdf' ? isPdfExporting : isExporting) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>
                    Export as {exportFormat.toUpperCase()}
                  </span>
                </>
              )}
            </Button>
          </div>

          {/* Processing indicator */}
          {(isExporting || isPdfExporting) && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2">
              <div className={`h-4 w-4 animate-spin rounded-full border-2 border-t-transparent ${
                exportFormat === 'pdf' ? 'border-rose-500' : 'border-teal-500'
              }`} />
              <span>Generating your {exportFormat.toUpperCase()} report...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Exports */}
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              Recent Exports
              {exportHistory.length > 0 && (
                <Badge variant="secondary" className="font-normal ml-1">
                  {exportHistory.length}
                </Badge>
              )}
            </CardTitle>
            {exportHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('export-history')}
                className="text-xs text-muted-foreground hover:text-foreground gap-1 rounded-lg"
              >
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl"
                >
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              ))}
            </div>
          ) : exportHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No exports yet
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                Export your first report to see it appear here.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-80 overflow-y-auto">
              <div className="space-y-2 pr-2">
                {exportHistory.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">
                          {record.filename}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-xs font-normal uppercase shrink-0"
                        >
                          {record.exportType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span>{formatRelativeTime(record.generatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground">
                      <Download className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Export History Link */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          onClick={() => setCurrentView('export-history')}
          className="text-sm text-muted-foreground hover:text-foreground gap-2 rounded-xl"
        >
          <History className="h-4 w-4" />
          View Full Export History
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
