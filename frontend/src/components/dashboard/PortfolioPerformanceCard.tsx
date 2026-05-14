"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  IndianRupee,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils/format";

interface PairSummaryItem {
  pair: string;
  realizedCount: number;
  grossProfit: string;
  netProfit: string;
  finalNetProfit: string;
  totalFees: string;
  winRate: string;
}

interface PortfolioPerformanceCardProps {
  totalSellValue: string;
  totalGrossProfit: string;
  pairSummary: PairSummaryItem[];
}

export function PortfolioPerformanceCard({
  totalSellValue,
  totalGrossProfit,
  pairSummary,
}: PortfolioPerformanceCardProps) {
  const { totalProfit, totalLoss, chartData, bestPair, worstPair } = useMemo(() => {
    let profit = 0;
    let loss = 0;
    let best: PairSummaryItem | null = null;
    let worst: PairSummaryItem | null = null;

    for (const pair of pairSummary) {
      const net = parseFloat(pair.finalNetProfit || pair.netProfit || "0");
      if (net > 0) {
        profit += net;
      } else {
        loss += Math.abs(net);
      }

      if (!best || net > parseFloat(best.finalNetProfit || best.netProfit || "0")) {
        best = pair;
      }
      if (!worst || net < parseFloat(worst.finalNetProfit || worst.netProfit || "0")) {
        worst = pair;
      }
    }

    const data = [
      { name: "Profit", value: profit, color: "#10b981" },
      { name: "Loss", value: loss, color: "#ef4444" },
    ];

    return {
      totalProfit: profit,
      totalLoss: loss,
      chartData: data,
      bestPair: best,
      worstPair: worst,
    };
  }, [pairSummary]);

  const hasChart = totalProfit > 0 || totalLoss > 0;

  return (
    <Card className="rounded-2xl border shadow-sm bg-gradient-to-br from-teal-500/5 via-card to-orange-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
            <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          Portfolio Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Stats */}
          <div className="space-y-4">
            {/* Total Portfolio Value */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <IndianRupee className="h-3 w-3" />
                Total Portfolio Value
              </div>
              <p className="text-xl font-bold text-foreground tracking-tight">
                {formatINR(totalSellValue)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Sum of all sell values
              </p>
            </div>

            {/* Unrealized P&L Placeholder */}
            <div className="flex items-start gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
              <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  Unrealized P&L
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Connect exchange API for live prices
                </p>
              </div>
            </div>

            {/* Best / Worst Pairs */}
            <div className="grid grid-cols-2 gap-3">
              {bestPair && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-2.5">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 mb-1">
                    <TrendingUp className="h-3 w-3" />
                    Best Pair
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {bestPair.pair}
                  </p>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {formatINR(bestPair.finalNetProfit || bestPair.netProfit)}
                  </p>
                </div>
              )}
              {worstPair && (
                <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-2.5">
                  <div className="flex items-center gap-1 text-[10px] text-red-500 mb-1">
                    <TrendingDown className="h-3 w-3" />
                    Worst Pair
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {worstPair.pair}
                  </p>
                  <p className="text-xs font-medium text-red-500">
                    {formatINR(worstPair.finalNetProfit || worstPair.netProfit)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Donut Chart */}
          <div className="flex flex-col items-center justify-center">
            {hasChart ? (
              <>
                <div className="relative w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                        formatter={(value: number) => [
                          formatINR(value),
                          "",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p
                      className={`text-sm font-bold ${
                        parseFloat(totalGrossProfit) >= 0
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {formatINR(totalProfit - totalLoss)}
                    </p>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">
                      Profit {formatINR(totalProfit)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="text-xs text-muted-foreground">
                      Loss {formatINR(totalLoss)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3">
                  <Wallet className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  No profit/loss data yet
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Process trades to see distribution
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
