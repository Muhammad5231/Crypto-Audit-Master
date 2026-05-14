'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowRight,
  CalendarDays,
  Layers,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calculator,
  Landmark,
  BadgeIndianRupee,
} from 'lucide-react'
import { formatINR, formatQuantity, getValueColor } from '@/lib/utils/format'
import { formatDate } from '@/lib/utils/dateUtils'

export interface Trade {
  pair: string
  buyDate: string
  sellDate: string
  matchedQty: string
  buyPrice: string
  sellPrice: string
  buyValue: string
  sellValue: string
  grossProfit: string
  buyFee: string
  sellFee: string
  totalFees: string
  gstOnFees: string
  tds: string
  baseTax?: string
  baseCryptoTax?: string
  tax?: string
  cess: string
  totalDirectTax: string
  netProfit?: string
  netProfitInHand?: string
  finalNetProfit: string
}

interface TradeDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade: Trade | null
}

function MetricItem({
  label,
  value,
  className,
  mono = true,
}: {
  label: string
  value: string
  className?: string
  mono?: boolean
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground leading-none">{label}</p>
      <p className={`text-sm font-medium ${mono ? 'font-mono' : ''} ${className ?? 'text-foreground'}`}>
        {value}
      </p>
    </div>
  )
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode
  title: string
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
    </div>
  )
}

export function TradeDetailModal({ open, onOpenChange, trade }: TradeDetailModalProps) {
  if (!trade) return null

  const baseTaxValue = trade.baseCryptoTax ?? trade.tax ?? trade.baseTax ?? '0'
  const netProfitValue = trade.netProfitInHand ?? trade.netProfit ?? '0'
  const totalTaxValue = trade.totalDirectTax ?? (trade as any).totalTax ?? '0'

  const grossVal = parseFloat(trade.grossProfit) || 0
  const netVal = parseFloat(trade.netProfit) || 0
  const finalVal = parseFloat(trade.finalNetProfit) || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-teal-500/10 text-teal-700 dark:text-teal-400 font-semibold"
            >
              {trade.pair}
            </Badge>
            <span className="text-foreground">Trade Details</span>
          </DialogTitle>
          <DialogDescription>
            Full breakdown of realized trade tax computation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* ── Trade Info ─────────────────────────────── */}
          <div className="space-y-3">
            <SectionHeader
              icon={<CalendarDays className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
              title="Trade Info"
            />
            <div className="rounded-xl bg-muted/40 border border-border/50 p-3 space-y-2">
              <MetricItem label="Trading Pair" value={trade.pair} mono={false} />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground text-[11px]">Buy Date</span>
                <ArrowRight className="h-3 w-3 text-orange-500" />
                <span className="text-muted-foreground text-[11px]">Sell Date</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatDate(trade.buyDate)}</span>
                <ArrowRight className="h-3 w-3 text-orange-500" />
                <span className="text-sm font-medium">{formatDate(trade.sellDate)}</span>
              </div>
              <MetricItem label="Matched Quantity" value={formatQuantity(trade.matchedQty)} />
            </div>
          </div>

          <Separator />

          {/* ── Pricing ────────────────────────────────── */}
          <div className="space-y-3">
            <SectionHeader
              icon={<TrendingUp className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />}
              title="Pricing"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3 space-y-2">
                <p className="text-[11px] text-muted-foreground font-medium">Buy Side</p>
                <MetricItem label="Price" value={formatINR(trade.buyPrice)} />
                <MetricItem label="Total Value" value={formatINR(trade.buyValue)} />
                {(trade.buyFee !== undefined && trade.buyFee !== '0') && (
                  <MetricItem label="Fee" value={formatINR(trade.buyFee)} className="text-red-400" />
                )}
              </div>
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3 space-y-2">
                <p className="text-[11px] text-muted-foreground font-medium">Sell Side</p>
                <MetricItem label="Price" value={formatINR(trade.sellPrice)} />
                <MetricItem label="Total Value" value={formatINR(trade.sellValue)} />
                {(trade.sellFee !== undefined && trade.sellFee !== '0') && (
                  <MetricItem label="Fee" value={formatINR(trade.sellFee)} className="text-red-400" />
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Profit Analysis ────────────────────────── */}
          <div className="space-y-3">
            <SectionHeader
              icon={grossVal >= 0
                ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              }
              title="Profit Analysis"
            />
            <div className="rounded-xl border p-4 space-y-1">
              <p className="text-[11px] text-muted-foreground">Gross Profit</p>
              <p className={`text-xl font-bold font-mono ${getValueColor(trade.grossProfit)}`}>
                {formatINR(trade.grossProfit)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Sell Value − Buy Value
              </p>
            </div>
          </div>

          <Separator />

          {/* ── Fee Breakdown ──────────────────────────── */}
          <div className="space-y-3">
            <SectionHeader
              icon={<Receipt className="h-3.5 w-3.5 text-red-500" />}
              title="Fee Breakdown"
            />
            <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-3">
              <div className="grid grid-cols-3 gap-3">
                <MetricItem label="Buy Fee" value={formatINR(trade.buyFee ?? '0')} className="text-red-400" />
                <MetricItem label="Sell Fee" value={formatINR(trade.sellFee ?? '0')} className="text-red-400" />
                <MetricItem label="Total Fees" value={formatINR(trade.totalFees)} className="text-red-400 font-semibold" />
              </div>
              <Separator className="my-2 bg-red-500/10" />
              <MetricItem label="GST on Fees (18%)" value={formatINR(trade.gstOnFees)} className="text-red-400" />
            </div>
          </div>

          <Separator />

          {/* ── Tax Computation ────────────────────────── */}
          <div className="space-y-3">
            <SectionHeader
              icon={<Calculator className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
              title="Tax Computation"
            />
            <div className="rounded-xl bg-violet-500/5 border border-violet-500/10 p-3 space-y-2">
              <MetricItem label="Base Tax (30% of profit)" value={formatINR(baseTaxValue)} className="text-violet-400" />
              {(trade.cess !== undefined) && (
                <MetricItem label="Cess (4% of base tax)" value={formatINR(trade.cess)} className="text-violet-400" />
              )}
              <MetricItem label="TDS (1% of sell value)" value={formatINR(trade.tds)} className="text-red-400" />
              <Separator className="bg-violet-500/10" />
              <MetricItem
                label="Total Direct Tax"
                value={formatINR(totalTaxValue)}
                className="text-violet-400 font-semibold"
              />
            </div>
          </div>

          <Separator />

          {/* ── Net Result ─────────────────────────────── */}
          <div className="space-y-3">
            <SectionHeader
              icon={<Landmark className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
              title="Net Result"
            />
            <div className="space-y-2">
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BadgeIndianRupee className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Net Profit (after fees)</span>
                </div>
                <span className={`text-sm font-bold font-mono ${getValueColor(netProfitValue)}`}>
                  {formatINR(netProfitValue)}
                </span>
              </div>
              <div className={`rounded-xl border-2 p-4 ${finalVal >= 0
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/20'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {finalVal >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-sm font-medium text-foreground">Final Net Profit</span>
                  </div>
                  <span className={`text-2xl font-bold font-mono ${getValueColor(trade.finalNetProfit)}`}>
                    {formatINR(trade.finalNetProfit)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Gross Profit − Total Fees − GST − Direct Tax − TDS
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
