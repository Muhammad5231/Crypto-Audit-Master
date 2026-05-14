import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  FileSpreadsheet,
  IndianRupee,
  Loader2,
  PieChart as PieIcon,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAppStore } from "@/store/appStore";
import { reportApi, uploadApi } from "@/lib/api";

function n(value: any) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function money(value: any) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n(value));
}

function compact(value: any) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n(value));
}

function getWorkspaceId(workspace: any) {
  return workspace?.id || workspace?._id || "";
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone = "default",
  sub,
}: {
  title: string;
  value: string;
  icon: any;
  tone?: "profit" | "loss" | "tax" | "default";
  sub?: string;
}) {
  const color =
    tone === "profit"
      ? "from-emerald-500/20 to-teal-500/5 text-emerald-500"
      : tone === "loss"
      ? "from-red-500/20 to-orange-500/5 text-red-500"
      : tone === "tax"
      ? "from-orange-500/20 to-yellow-500/5 text-orange-500"
      : "from-sky-500/20 to-cyan-500/5 text-sky-500";

  return (
    <Card className="rounded-3xl border-border/50 bg-card/80 backdrop-blur-xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <h3 className="mt-2 text-2xl font-black tracking-tight">{value}</h3>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div
            className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardView() {
  const { activeWorkspace } = useWorkspaceStore();
  const { setCurrentView } = useAppStore();

  const workspaceId = getWorkspaceId(activeWorkspace);

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [uploads, setUploads] = useState<any[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!workspaceId) return;

    setLoading(true);
    try {
      const [analyticsRes, uploadRes] = await Promise.all([
        reportApi.getAnalytics(workspaceId),
        uploadApi.list(workspaceId),
      ]);

      setAnalytics(analyticsRes || {});
      setUploads(uploadRes?.uploads || []);
    } catch (err: any) {
      toast.error("Dashboard load failed", {
        description: err?.message || "Backend response error",
      });
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = analytics?.summary || {};
  const realizedTrades = analytics?.realizedTrades || [];
  const openHoldings = analytics?.openHoldings || [];
  const warnings = analytics?.warnings || [];

  const totals = {
    grossProfit: n(summary.grossProfit || summary.totalGrossProfit),
    finalNetProfit: n(summary.finalNetProfit || summary.totalFinalNetProfit),
    netProfitInHand: n(summary.netProfitInHand || summary.totalNetProfit),
    totalFees: n(summary.totalFees),
    gst: n(summary.gstOnFees || summary.totalGstOnFees),
    tds: n(summary.tds || summary.totalTds),
    tax: n(summary.totalDirectTax),
    buyValue: n(summary.buyValue || summary.totalBuyValue),
    sellValue: n(summary.sellValue || summary.totalSellValue),
    realizedCount: realizedTrades.length,
    holdingsCount: openHoldings.length,
  };

  const dailyProfit = useMemo(() => {
    const map: Record<string, { date: string; profit: number; trades: number }> = {};

    realizedTrades.forEach((t: any) => {
      const rawDate = t.sellDate || t.createdAt || t.buyDate;
      const date = rawDate
        ? new Date(rawDate).toISOString().slice(0, 10)
        : "Unknown";

      map[date] ||= { date, profit: 0, trades: 0 };
      map[date].profit += n(t.finalNetProfit);
      map[date].trades += 1;
    });

    const arr = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));

    if (arr.length === 1) {
      const only = arr[0];
      return [
        { date: "Start", profit: 0, trades: 0 },
        only,
        { date: "End", profit: only.profit, trades: only.trades },
      ];
    }

    return arr;
  }, [realizedTrades]);

  const pairPerformance = useMemo(() => {
    const map: Record<string, { pair: string; profit: number; trades: number }> = {};

    realizedTrades.forEach((t: any) => {
      const pair = t.pair || "UNKNOWN";
      map[pair] ||= { pair, profit: 0, trades: 0 };
      map[pair].profit += n(t.finalNetProfit);
      map[pair].trades += 1;
    });

    return Object.values(map)
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
      .slice(0, 8);
  }, [realizedTrades]);

  const taxData = useMemo(
    () => [
      { name: "Direct Tax", value: totals.tax },
      { name: "TDS", value: totals.tds },
      { name: "GST Fees", value: totals.gst },
      { name: "Fees", value: totals.totalFees },
    ].filter((x) => x.value > 0),
    [totals.tax, totals.tds, totals.gst, totals.totalFees]
  );

  const uploadTrades = uploads.reduce((sum, file) => sum + n(file.parsedCount), 0);

  const handleProcess = async () => {
    if (!workspaceId) return;

    setProcessing(true);
    try {
      const res = await reportApi.process(workspaceId);
      toast.success("Processing complete", {
        description: `${res.realizedCount || 0} realized trades, ${
          res.holdingsCount || 0
        } open holdings.`,
      });
      await loadDashboard();
    } catch (err: any) {
      toast.error("Processing failed", {
        description: err?.message || "Try upload CSV again",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!workspaceId) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Card className="max-w-xl w-full rounded-3xl">
          <CardContent className="p-8 text-center">
            <Wallet className="mx-auto h-12 w-12 text-teal-500" />
            <h2 className="mt-4 text-2xl font-black">No workspace selected</h2>
            <p className="mt-2 text-muted-foreground">
              Pehle workspace create/select karo, phir CSV upload karo.
            </p>
            <Button className="mt-5" onClick={() => setCurrentView("workspaces")}>
              Go to Workspaces
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-6 text-white shadow-2xl">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-20 h-40 w-40 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-200">
              Crypto Audit Master
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight lg:text-5xl">
              {activeWorkspace?.name || "Dashboard"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              FIFO profit, fees, GST, TDS and Indian crypto tax summary in one
              clean dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() => setCurrentView("upload")}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>

            <Button
              className="rounded-2xl bg-teal-500 text-slate-950 hover:bg-teal-400"
              onClick={handleProcess}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Process Trades
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Final Net Profit"
              value={money(totals.finalNetProfit)}
              icon={TrendingUp}
              tone={totals.finalNetProfit >= 0 ? "profit" : "loss"}
              sub="After tax adjustment"
            />

            <MetricCard
              title="Gross Profit"
              value={money(totals.grossProfit)}
              icon={IndianRupee}
              tone={totals.grossProfit >= 0 ? "profit" : "loss"}
              sub="Sell value - buy value"
            />

            <MetricCard
              title="Direct Tax"
              value={money(totals.tax)}
              icon={ShieldCheck}
              tone="tax"
              sub="30% tax + 4% cess"
            />

            <MetricCard
              title="Open Holdings"
              value={String(totals.holdingsCount)}
              icon={Wallet}
              sub={`${totals.realizedCount} realized trades`}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="CSV Trades"
              value={String(uploadTrades)}
              icon={FileSpreadsheet}
              sub={`${uploads.length} uploaded file(s)`}
            />
            <MetricCard
              title="Total Fees"
              value={money(totals.totalFees)}
              icon={ArrowDownRight}
              tone="tax"
              sub="CSV fee or fallback %"
            />
            <MetricCard
              title="GST on Fees"
              value={money(totals.gst)}
              icon={PieIcon}
              tone="tax"
              sub="18% only on fees"
            />
            <MetricCard
              title="TDS"
              value={money(totals.tds)}
              icon={ArrowUpRight}
              tone="tax"
              sub="Withheld amount"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2 rounded-3xl border-border/50 bg-card/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-teal-500" />
                  Profit Over Time
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[340px]">
                {dailyProfit.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyProfit}>
                      <defs>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => money(v)} />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="#14b8a6"
                        strokeWidth={3}
                        fill="url(#profitGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyDashboardText onUpload={() => setCurrentView("upload")} />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
              <CardHeader>
                <CardTitle>Tax & Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-[340px]">
                {taxData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taxData}
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {taxData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={["#14b8a6", "#f97316", "#38bdf8", "#a78bfa"][i % 4]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => money(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyDashboardText onUpload={() => setCurrentView("upload")} />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2 rounded-3xl border-border/50 bg-card/80 shadow-sm">
              <CardHeader>
                <CardTitle>Pair Performance</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                {pairPerformance.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pairPerformance}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="pair" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => money(v)} />
                      <Bar dataKey="profit" radius={[12, 12, 0, 0]} fill="#14b8a6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyDashboardText onUpload={() => setCurrentView("upload")} />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm">
              <CardHeader>
                <CardTitle>Audit Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <StatusRow label="Uploaded Files" value={uploads.length} />
                <StatusRow label="Parsed Trades" value={uploadTrades} />
                <StatusRow label="Realized Trades" value={totals.realizedCount} />
                <StatusRow label="Open Holdings" value={totals.holdingsCount} />
                <StatusRow label="Warnings" value={warnings.length} />

                {uploads.length > 0 && totals.realizedCount === 0 && (
                  <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm">
                    CSV upload ho gayi hai. Ab <b>Process Trades</b> click karo
                    ya Upload Center se process karo.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function EmptyDashboardText({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Upload className="h-10 w-10 text-muted-foreground" />
      <h3 className="mt-3 font-bold">No processed data</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        CSV upload karo, then Process Trades click karo.
      </p>
      <Button className="mt-4 rounded-2xl" onClick={onUpload}>
        Upload CSV
      </Button>
    </div>
  );
}