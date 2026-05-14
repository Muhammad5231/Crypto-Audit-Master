import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  FileSpreadsheet,
  IndianRupee,
  Loader2,
  PieChart as PieIcon,
  ShieldCheck,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
  const num = Number(value ?? 0);
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

function shortDate(value: any) {
  if (!value || value === "Start" || value === "End") return value || "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
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
  const style =
    tone === "profit"
      ? "bg-teal-500/10 text-teal-400"
      : tone === "loss"
        ? "bg-red-500/10 text-red-400"
        : tone === "tax"
          ? "bg-orange-500/10 text-orange-400"
          : "bg-sky-500/10 text-sky-400";

  return (
    <Card className="rounded-2xl border-border/50 bg-card/70 shadow-sm backdrop-blur-xl">
      <CardContent className="px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style}`}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/90">
              {title}
            </p>

            <h3 className="mt-1 truncate text-[18px] font-black leading-none tracking-tight text-foreground">
              {value}
            </h3>

            {sub && (
              <p className="mt-1 truncate text-[10px] text-muted-foreground">
                {sub}
              </p>
            )}
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
  const realizedTrades = Array.isArray(analytics?.realizedTrades)
    ? analytics.realizedTrades
    : [];
  const openHoldings = Array.isArray(analytics?.openHoldings)
    ? analytics.openHoldings
    : [];
  const warnings = Array.isArray(analytics?.warnings) ? analytics.warnings : [];

  const totals = {
    grossProfit: n(summary.grossProfit ?? summary.totalGrossProfit),
    finalNetProfit: n(summary.finalNetProfit ?? summary.totalFinalNetProfit),
    totalFees: n(summary.totalFees),
    gst: n(summary.gstOnFees ?? summary.totalGstOnFees),
    tds: n(summary.tds ?? summary.totalTds),
    tax: n(summary.totalDirectTax),
    baseTax: n(summary.baseCryptoTax ?? summary.totalBaseTax),
    cess: n(summary.cess ?? summary.totalCess),
    buyValue: n(summary.buyValue ?? summary.totalBuyValue),
    sellValue: n(summary.sellValue ?? summary.totalSellValue),
    realizedCount: realizedTrades.length,
    holdingsCount: openHoldings.length,
  };

  const uploadTrades = uploads.reduce((sum, file) => sum + n(file.parsedCount), 0);

  const profitOverTime = useMemo(() => {
    const map: Record<string, { date: string; profit: number; trades: number }> = {};

    realizedTrades.forEach((trade: any) => {
      const rawDate = trade.sellDate || trade.buyDate || trade.createdAt;
      const dateObj = rawDate ? new Date(rawDate) : null;

      if (!dateObj || Number.isNaN(dateObj.getTime())) return;

      const key = dateObj.toISOString().slice(0, 10);

      map[key] ||= {
        date: key,
        profit: 0,
        trades: 0,
      };

      map[key].profit += n(trade.finalNetProfit ?? trade.grossProfit);
      map[key].trades += 1;
    });

    const data = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));

    if (data.length === 1) {
      return [
        { date: "Start", profit: 0, trades: 0 },
        data[0],
        { date: "End", profit: data[0].profit, trades: data[0].trades },
      ];
    }

    return data;
  }, [realizedTrades]);

  const pairPerformance = useMemo(() => {
    const map: Record<string, { pair: string; profit: number; trades: number }> = {};

    realizedTrades.forEach((trade: any) => {
      const pair = String(trade.pair || "UNKNOWN").toUpperCase();

      map[pair] ||= {
        pair,
        profit: 0,
        trades: 0,
      };

      map[pair].profit += n(trade.finalNetProfit ?? trade.grossProfit);
      map[pair].trades += 1;
    });

    return Object.values(map)
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
      .slice(0, 5);
  }, [realizedTrades]);

  const taxData = useMemo(
    () =>
      [
        { name: "Base Crypto Tax (30%)", value: totals.baseTax || Math.max(totals.tax - totals.cess, 0) },
        { name: "TDS (1%)", value: totals.tds },
        { name: "GST on Fees (18%)", value: totals.gst },
        { name: "Cess (4%)", value: totals.cess },
      ].filter((item) => item.value > 0),
    [totals.baseTax, totals.tax, totals.cess, totals.tds, totals.gst]
  );

  const recentTrades = realizedTrades.slice(0, 5);
  const lastUpload = uploads[0]?.createdAt || uploads[0]?.uploadedAt || uploads[0]?.updatedAt;

  if (!workspaceId) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-xl rounded-3xl">
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

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      {/* Key metric cards */}
      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
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
          sub="Sell - Buy value"
        />

        <MetricCard
          title="Direct Tax"
          value={money(totals.tax)}
          icon={ShieldCheck}
          tone="tax"
          sub="30% + 4% cess"
        />

        <MetricCard
          title="Open Holdings"
          value={String(totals.holdingsCount)}
          icon={Wallet}
          sub={`${totals.realizedCount} realized`}
        />

        <MetricCard
          title="CSV Trades"
          value={String(uploadTrades)}
          icon={FileSpreadsheet}
          sub={`${uploads.length} uploaded`}
        />

        <MetricCard
          title="Total Fees"
          value={money(totals.totalFees)}
          icon={PieIcon}
          tone="tax"
          sub="CSV or fallback"
        />

        <MetricCard
          title="GST on Fees"
          value={money(totals.gst)}
          icon={BarChart3}
          tone="tax"
          sub="18% on fees"
        />

        <MetricCard
          title="TDS"
          value={money(totals.tds)}
          icon={TrendingUp}
          tone="tax"
          sub="Withheld tax"
        />
      </section>

      {/* Image-like dashboard grid */}
      <section className="grid gap-3 xl:grid-cols-12">
        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-sm backdrop-blur-xl xl:col-span-7">
          <CardHeader className="flex flex-row items-start justify-between p-4 pb-1">
            <div>
              <CardTitle className="text-base">Profit Over Time</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Showing realized profit over selected period
              </p>
            </div>
            <div className="rounded-xl border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground">
              Daily
            </div>
          </CardHeader>

          <CardContent className="h-[275px] p-4 pt-2">
            {profitOverTime.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitOverTime}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={shortDate}
                  />
                  <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [money(value), "Profit"]}
                    labelFormatter={shortDate}
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid rgba(148,163,184,.25)",
                      background: "rgba(2,6,23,.94)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#14b8a6"
                    strokeWidth={3}
                    fill="url(#profitGradient)"
                    dot={{ r: 3, fill: "#14b8a6" }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyDashboardText onUpload={() => setCurrentView("upload")} />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-sm backdrop-blur-xl xl:col-span-5">
          <CardHeader className="flex flex-row items-start justify-between p-4 pb-1">
            <div>
              <CardTitle className="text-base">Profit by Trading Pair</CardTitle>
            </div>
            <div className="rounded-xl border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground">
              By Profit
            </div>
          </CardHeader>

          <CardContent className="h-[275px] p-4 pt-1">
            {pairPerformance.length ? (
              <div className="grid h-full grid-cols-12 items-center gap-3">
                <div className="col-span-5 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pairPerformance}
                        innerRadius={48}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="profit"
                      >
                        {pairPerformance.map((_, index) => (
                          <Cell
                            key={index}
                            fill={["#14b8a6", "#8b5cf6", "#f97316", "#facc15", "#64748b"][index % 5]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => money(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="col-span-7 space-y-3">
                  {pairPerformance.map((item, index) => {
                    const total = pairPerformance.reduce((s, p) => s + Math.abs(p.profit), 0);
                    const percent = total ? (Math.abs(item.profit) / total) * 100 : 0;

                    return (
                      <div key={item.pair} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                ["#14b8a6", "#8b5cf6", "#f97316", "#facc15", "#64748b"][index % 5],
                            }}
                          />
                          <span>{item.pair}</span>
                        </div>
                        <span className="text-muted-foreground">{money(item.profit)}</span>
                        <span>{percent.toFixed(1)}%</span>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => setCurrentView("analytics")}
                    className="ml-auto flex items-center gap-2 pt-2 text-xs font-medium text-teal-400 hover:text-teal-300"
                  >
                    View full analytics
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <EmptyDashboardText onUpload={() => setCurrentView("upload")} />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-sm backdrop-blur-xl xl:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <CardTitle className="text-base">Recent Realized Trades</CardTitle>
            <button
              onClick={() => setCurrentView("realized-trades")}
              className="text-xs font-medium text-teal-400 hover:text-teal-300"
            >
              View All
            </button>
          </CardHeader>

          <CardContent className="p-4 pt-0">
            {recentTrades.length ? (
              <div className="overflow-hidden rounded-2xl">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-2 text-left font-medium">Date</th>
                      <th className="py-2 text-left font-medium">Pair</th>
                      <th className="py-2 text-left font-medium">Side</th>
                      <th className="py-2 text-right font-medium">Qty</th>
                      <th className="py-2 text-right font-medium">Buy Price</th>
                      <th className="py-2 text-right font-medium">Sell Price</th>
                      <th className="py-2 text-right font-medium">Profit</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentTrades.map((trade: any, index: number) => {
                      const profit = n(trade.finalNetProfit ?? trade.grossProfit);

                      return (
                        <tr key={trade.id || trade._id || index} className="border-t border-border/40">
                          <td className="py-2.5 text-muted-foreground">
                            {shortDate(trade.sellDate || trade.buyDate)}
                          </td>
                          <td className="py-2.5 font-medium">{trade.pair || "UNKNOWN"}</td>
                          <td className="py-2.5">
                            <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                              SELL
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            {n(trade.matchedQty ?? trade.quantity).toLocaleString("en-IN", {
                              maximumFractionDigits: 8,
                            })}
                          </td>
                          <td className="py-2.5 text-right">{money(trade.buyPrice)}</td>
                          <td className="py-2.5 text-right">{money(trade.sellPrice)}</td>
                          <td className={`py-2.5 text-right font-bold ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {money(profit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <button
                  onClick={() => setCurrentView("realized-trades")}
                  className="ml-auto mt-3 flex items-center gap-2 text-xs font-medium text-teal-400 hover:text-teal-300"
                >
                  View all realized trades
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <EmptyDashboardText onUpload={() => setCurrentView("upload")} />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-sm backdrop-blur-xl xl:col-span-5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Tax Breakdown (Est.)</CardTitle>
          </CardHeader>

          <CardContent className="h-[255px] p-4 pt-0">
            {taxData.length ? (
              <div className="grid h-full grid-cols-12 items-center gap-3">
                <div className="col-span-5 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taxData}
                        innerRadius={48}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {taxData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={["#14b8a6", "#8b5cf6", "#f97316", "#facc15"][index % 4]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => money(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="col-span-7 space-y-3">
                  {taxData.map((item, index) => {
                    const total = taxData.reduce((s, x) => s + x.value, 0);
                    const percent = total ? (item.value / total) * 100 : 0;

                    return (
                      <div key={item.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                ["#14b8a6", "#8b5cf6", "#f97316", "#facc15"][index % 4],
                            }}
                          />
                          <span>{item.name}</span>
                        </div>
                        <span className="text-muted-foreground">{money(item.value)}</span>
                        <span>{percent.toFixed(1)}%</span>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => setCurrentView("tax-summary")}
                    className="ml-auto flex items-center gap-2 pt-2 text-xs font-medium text-teal-400 hover:text-teal-300"
                  >
                    View full tax report
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <EmptyDashboardText onUpload={() => setCurrentView("upload")} />
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl border-border/50 bg-card/70 shadow-sm backdrop-blur-xl">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-base">Workspace Summary</CardTitle>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryItem icon={FileSpreadsheet} label="Total CSV Files" value={`${uploads.length} Files`} />
            <SummaryItem icon={BarChart3} label="Total Trades" value={uploadTrades.toLocaleString("en-IN")} />
            <SummaryItem icon={TrendingUp} label="Last Data Update" value={lastUpload ? shortDate(lastUpload) : "-"} />
            <SummaryItem icon={ShieldCheck} label="Workspace" value={warnings.length ? `${warnings.length} Warnings` : "Isolated & Secure"} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 border-r border-border/50 last:border-r-0 max-md:border-r-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

function EmptyDashboardText({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Upload className="h-9 w-9 text-muted-foreground" />
      <h3 className="mt-3 text-sm font-bold">No processed data</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Upload Center me CSV upload karo.
      </p>
      <Button size="sm" className="mt-3 rounded-xl" onClick={onUpload}>
        Upload CSV
      </Button>
    </div>
  );
}