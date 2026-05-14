'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAppStore } from '@/store/appStore'
import { reportApi } from '@/lib/api'
import { formatINR, formatQuantity } from '@/lib/utils/format'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Wallet,
  FileX2,
  Info,
  Search,
  Upload,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  IndianRupee,
  BarChart3,
  AlertCircle,
} from 'lucide-react'

interface Holding {
  pair: string
  remainingQty: string
  avgBuyPrice: string
  totalBuyValue: string
  sourceCount: number
}

export function OpenHoldingsView() {
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace)
  const isMobile = useIsMobile()

  const [holdings, setHoldings] = useState<Holding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchHoldings = useCallback(async () => {
    if (!activeWorkspace?.id) return
    setIsLoading(true)
    try {
      const result = await reportApi.getOpenHoldings(activeWorkspace.id)
      const list = (result as any).holdings ?? []
      setHoldings(list)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load holdings')
      setHoldings([])
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkspace?.id])

  useEffect(() => {
    fetchHoldings()
  }, [fetchHoldings])

  // Filter holdings by search query
  const filteredHoldings = useMemo(() => {
    if (!searchQuery.trim()) return holdings
    const q = searchQuery.toLowerCase()
    return holdings.filter((h) =>
      h.pair.toLowerCase().includes(q)
    )
  }, [holdings, searchQuery])

  // Total portfolio value
  const totalValue = useMemo(() => {
    return filteredHoldings.reduce(
      (sum, h) => sum + (parseFloat(h.totalBuyValue) || 0),
      0
    )
  }, [filteredHoldings])

  // Total source count (all lots)
  const totalLots = useMemo(() => {
    return filteredHoldings.reduce(
      (sum, h) => sum + (Number(h.sourceCount) || 0),
      0
    )
  }, [filteredHoldings])

  // ─── Loading skeleton ────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
        {isMobile ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Empty state ─────────────────────────────────────
  if (holdings.length === 0) {
    return (
      <div className="space-y-4">
        <InfoBanner />
        <EmptyState />
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Info banner */}
      <InfoBanner />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
        <StatCard
          icon={<Package className="h-4 w-4 text-teal-600 dark:text-teal-400" />}
          iconBg="bg-teal-500/10"
          label="Holdings"
          value={String(filteredHoldings.length)}
          sublabel={filteredHoldings.length !== holdings.length ? `of ${holdings.length}` : undefined}
        />
        <StatCard
          icon={<IndianRupee className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
          iconBg="bg-orange-500/10"
          label="Invested"
          value={formatINR(totalValue)}
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
          iconBg="bg-violet-500/10"
          label="Buy Lots"
          value={String(totalLots)}
          className="hidden sm:block"
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by pair name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 rounded-xl bg-muted/50 border-border/50"
        />
      </div>

      {/* Filtered empty state */}
      {filteredHoldings.length === 0 && searchQuery.trim() && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            No holdings matching &quot;{searchQuery}&quot;
          </p>
        </div>
      )}

      {/* Holdings count */}
      {filteredHoldings.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {filteredHoldings.length} open position{filteredHoldings.length !== 1 ? 's' : ''} &middot;{' '}
          {totalLots} buy lot{totalLots !== 1 ? 's' : ''}
        </div>
      )}

      {/* Mobile: Card grid */}
      {!isMobile && filteredHoldings.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Pair</TableHead>
                <TableHead className="text-right">Remaining Quantity</TableHead>
                <TableHead className="text-right">Avg Buy Price</TableHead>
                <TableHead className="text-right">Invested Value</TableHead>
                <TableHead className="text-right">Est. P&L</TableHead>
                <TableHead className="text-right">Lots</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHoldings.map((holding, idx) => (
                <TableRow key={`${holding.pair}-${idx}`}>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-teal-500/10 text-teal-700 dark:text-teal-400 font-semibold"
                    >
                      {holding.pair}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatQuantity(holding.remainingQty)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatINR(holding.avgBuyPrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-orange-600 dark:text-orange-400">
                    {formatINR(holding.totalBuyValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <PLCell />
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {holding.sourceCount} lot{Number(holding.sourceCount) !== 1 ? 's' : ''}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableCell className="font-bold text-foreground">
                  Total ({filteredHoldings.length} positions)
                </TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right font-mono font-bold text-orange-600 dark:text-orange-400">
                  {formatINR(totalValue)}
                </TableCell>
                <TableCell className="text-right">
                  <PLCell />
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  {totalLots} lots
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )}

      {/* Mobile: Card grid */}
      {isMobile && filteredHoldings.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredHoldings.map((holding, idx) => (
            <HoldingCardEnhanced
              key={`${holding.pair}-${idx}`}
              holding={holding}
            />
          ))}
        </div>
      )}

      {/* P&L Disclaimer */}
      {filteredHoldings.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200/60 bg-amber-50/50 p-3 text-sm dark:border-amber-800/30 dark:bg-amber-950/20">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Real-time price data not available.</span>{' '}
            P&L estimation requires live market prices. The &quot;Invested Value&quot; column shows
            your cost basis (avg buy price &times; quantity).
          </p>
        </div>
      )}

      {/* Portfolio Value Summary */}
      {filteredHoldings.length > 0 && (
        <Card className="border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-teal-500/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Portfolio Cost Basis
                </p>
                <p className="text-xs text-muted-foreground">
                  {filteredHoldings.length} position{filteredHoldings.length !== 1 ? 's' : ''} &middot; {totalLots} lots
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold font-mono bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
                {formatINR(totalValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total invested value
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────

function StatCard({
  icon,
  iconBg,
  label,
  value,
  sublabel,
  className,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  sublabel?: string
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold font-mono text-foreground truncate">{value}</p>
            {sublabel && (
              <p className="text-[11px] text-muted-foreground">{sublabel}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── P&L Cell ─────────────────────────────────────────

function PLCell() {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">N/A</span>
    </div>
  )
}

// ─── Enhanced Holding Card (Mobile) ────────────────────

function HoldingCardEnhanced({ holding }: { holding: Holding }) {
  const totalBuyValue = parseFloat(holding.totalBuyValue) || 0

  function getAccentColor(val: number): string {
    if (val >= 100000) return '#f97316'
    if (val >= 10000) return '#14b8a6'
    if (val > 0) return '#6b7280'
    return '#d1d5db'
  }

  const accentColor = getAccentColor(totalBuyValue)

  return (
    <Card
      className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/5 hover:scale-[1.01]"
      style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="bg-teal-500/10 text-teal-700 dark:text-teal-400 font-semibold text-xs"
          >
            {holding.pair}
          </Badge>
          {holding.sourceCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {holding.sourceCount} lot{Number(holding.sourceCount) > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Remaining Quantity */}
        <div className="mt-3">
          <div className="text-xs text-muted-foreground">Remaining Quantity</div>
          <div className="text-lg font-bold font-mono text-foreground">
            {formatQuantity(holding.remainingQty)}
          </div>
        </div>

        {/* Details Row */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Avg Buy Price</div>
            <div className="text-sm font-semibold font-mono">
              {formatINR(holding.avgBuyPrice)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Invested Value</div>
            <div className="text-sm font-bold font-mono" style={{ color: accentColor }}>
              {formatINR(holding.totalBuyValue)}
            </div>
          </div>
        </div>

        {/* P&L row */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Est. P&L</span>
            <div className="flex items-center gap-1.5">
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">N/A</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Empty State ──────────────────────────────────────

function EmptyState() {
  const setCurrentView = useAppStore((s) => s.setCurrentView)

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        className="relative mb-6"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex size-24 items-center justify-center rounded-3xl bg-muted/30 backdrop-blur-sm border border-border/30">
          <Wallet className="size-12 text-teal-600/60 dark:text-teal-400/60" />
        </div>
        <motion.div
          className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-muted border border-border/30"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <FileX2 className="size-4 text-muted-foreground" />
        </motion.div>
      </motion.div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        No Open Holdings
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        After processing trades, your open (unmatched) holdings will appear here.
        These represent crypto positions you still hold after FIFO matching.
      </p>
      <Button
        onClick={() => setCurrentView('upload')}
        className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
      >
        <Upload className="h-4 w-4 mr-2" />
        Go to Upload
      </Button>
    </div>
  )
}

// ─── Info Banner ───────────────────────────────────────

function InfoBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400" />
      <p className="text-muted-foreground leading-relaxed">
        These are <span className="font-medium text-foreground">unmatched buy positions</span>{' '}
        remaining after FIFO matching. They represent your current open holdings that have
        not yet been sold or matched against sell transactions.
      </p>
    </div>
  )
}
