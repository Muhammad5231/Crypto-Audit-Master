'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
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
  Minus,
  Package,
  IndianRupee,
  BarChart3,
  AlertCircle,
  X,
} from 'lucide-react'

interface Holding {
  pair: string
  remainingQty: string
  avgBuyPrice: string
  totalBuyValue: string
  sourceCount: number
  exchangeName?: string
}

function toNumber(value: unknown): number {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

function normalizeHolding(raw: any): Holding | null {
  const pair = String(raw?.pair || '').trim().toUpperCase()
  const remainingQty = toNumber(raw?.remainingQty ?? raw?.quantity)

  if (!pair || remainingQty <= 0) return null

  const totalBuyValue = toNumber(raw?.totalBuyValue ?? raw?.investedValue)
  const avgBuyPriceRaw = toNumber(raw?.avgBuyPrice ?? raw?.averageBuyPrice ?? raw?.buyPrice)
  const avgBuyPrice =
    avgBuyPriceRaw > 0
      ? avgBuyPriceRaw
      : remainingQty > 0
        ? totalBuyValue / remainingQty
        : 0

  const sourceCount =
    Number(raw?.sourceCount) ||
    (Array.isArray(raw?.sourceLots) ? raw.sourceLots.length : 0) ||
    1

  return {
    pair,
    remainingQty: String(remainingQty),
    avgBuyPrice: String(avgBuyPrice),
    totalBuyValue: String(totalBuyValue),
    sourceCount,
    exchangeName: String(raw?.exchangeName || raw?.exchange || '').trim() || undefined,
  }
}

export function OpenHoldingsView() {
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace)
  const isMobile = useIsMobile()

  const [holdings, setHoldings] = useState<Holding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchHoldings = useCallback(async () => {
    if (!activeWorkspace?.id) {
      setHoldings([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await reportApi.getOpenHoldings(activeWorkspace.id)
      const list = ((result as any).holdings ?? [])
        .map(normalizeHolding)
        .filter(Boolean) as Holding[]

      setHoldings(
        list.sort((a, b) => toNumber(b.totalBuyValue) - toNumber(a.totalBuyValue))
      )
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

  const filteredHoldings = useMemo(() => {
    if (!searchQuery.trim()) return holdings
    const query = searchQuery.toLowerCase()
    return holdings.filter(
      (holding) =>
        holding.pair.toLowerCase().includes(query) ||
        holding.exchangeName?.toLowerCase().includes(query)
    )
  }, [holdings, searchQuery])

  const totalValue = useMemo(
    () => filteredHoldings.reduce((sum, holding) => sum + toNumber(holding.totalBuyValue), 0),
    [filteredHoldings]
  )

  const totalLots = useMemo(
    () => filteredHoldings.reduce((sum, holding) => sum + (Number(holding.sourceCount) || 0), 0),
    [filteredHoldings]
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
        {isMobile ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (holdings.length === 0) {
    return (
      <div className="space-y-4">
        <InfoBanner />
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <InfoBanner />

      <div className="grid gap-3 md:grid-cols-3">
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
          label="Cost Basis"
          value={formatINR(totalValue)}
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
          iconBg="bg-violet-500/10"
          label="Buy Lots"
          value={String(totalLots)}
        />
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/60 p-3">
        <div className="relative w-full sm:max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by pair or exchange..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-10 rounded-xl border-border/50 bg-muted/40 pl-9 pr-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {filteredHoldings.length === 0 && searchQuery.trim() && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No holdings matching &quot;{searchQuery}&quot;
          </p>
        </div>
      )}

      {filteredHoldings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-full bg-muted/50 px-3 py-1">
            {filteredHoldings.length} open position{filteredHoldings.length !== 1 ? 's' : ''}
          </span>
          <span className="rounded-full bg-muted/50 px-3 py-1">
            {totalLots} buy lot{totalLots !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {!isMobile && filteredHoldings.length > 0 && (
        <Card className="overflow-hidden border-border/50 bg-card/70 p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Pair</TableHead>
                <TableHead className="text-right">Remaining Quantity</TableHead>
                <TableHead className="text-right">Avg Buy Price</TableHead>
                <TableHead className="text-right">Cost Basis</TableHead>
                <TableHead className="text-right">Est. P&amp;L</TableHead>
                <TableHead className="text-right">Lots</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHoldings.map((holding, index) => (
                <TableRow key={`${holding.pair}-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-teal-500/10 font-semibold text-teal-700 dark:text-teal-400">
                        {holding.pair}
                      </Badge>
                      {holding.exchangeName && (
                        <span className="text-xs text-muted-foreground">{holding.exchangeName}</span>
                      )}
                    </div>
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

      {isMobile && filteredHoldings.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredHoldings.map((holding, index) => (
            <HoldingCardEnhanced key={`${holding.pair}-${index}`} holding={holding} />
          ))}
        </div>
      )}

      {filteredHoldings.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 text-sm dark:border-amber-800/30 dark:bg-amber-950/20">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Real-time price data not available.</span>{' '}
            P&amp;L estimation requires live market prices. The &quot;Cost Basis&quot; column shows your cost basis
            (avg buy price × quantity).
          </p>
        </div>
      )}

      {filteredHoldings.length > 0 && (
        <Card className="border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-teal-500/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10">
                <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Portfolio Cost Basis</p>
                <p className="text-xs text-muted-foreground">
                  {filteredHoldings.length} position{filteredHoldings.length !== 1 ? 's' : ''} • {totalLots} lots
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
                {formatINR(totalValue)}
              </div>
              <p className="text-xs text-muted-foreground">Total invested value</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  sublabel,
}: {
  icon: ReactNode
  iconBg: string
  label: string
  value: string
  sublabel?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="truncate text-lg font-bold text-foreground">{value}</p>
            {sublabel && <p className="text-[11px] text-muted-foreground">{sublabel}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PLCell() {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">N/A</span>
    </div>
  )
}

function HoldingCardEnhanced({ holding }: { holding: Holding }) {
  const totalBuyValue = toNumber(holding.totalBuyValue)

  function getAccentColor(value: number): string {
    if (value >= 100000) return '#f97316'
    if (value >= 10000) return '#14b8a6'
    if (value > 0) return '#6b7280'
    return '#d1d5db'
  }

  const accentColor = getAccentColor(totalBuyValue)

  return (
    <Card
      className="overflow-hidden border-border/50 bg-card/70 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-teal-500/5"
      style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Badge variant="secondary" className="bg-teal-500/10 text-xs font-semibold text-teal-700 dark:text-teal-400">
              {holding.pair}
            </Badge>
            {holding.exchangeName && (
              <p className="text-[11px] text-muted-foreground">{holding.exchangeName}</p>
            )}
          </div>
          {holding.sourceCount > 0 && (
            <span className="rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
              {holding.sourceCount} lot{Number(holding.sourceCount) > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="mt-3">
          <div className="text-xs text-muted-foreground">Remaining Quantity</div>
          <div className="text-lg font-bold font-mono text-foreground">
            {formatQuantity(holding.remainingQty)}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Avg Buy Price</div>
            <div className="text-sm font-semibold font-mono">
              {formatINR(holding.avgBuyPrice)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Cost Basis</div>
            <div className="text-sm font-bold font-mono" style={{ color: accentColor }}>
              {formatINR(holding.totalBuyValue)}
            </div>
          </div>
        </div>

        <div className="mt-3 border-t border-border/50 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Est. P&amp;L</span>
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

function EmptyState() {
  const setCurrentView = useAppStore((s) => s.setCurrentView)

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        className="relative mb-6"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex size-24 items-center justify-center rounded-3xl border border-border/30 bg-muted/30 backdrop-blur-sm">
          <Wallet className="size-12 text-teal-600/60 dark:text-teal-400/60" />
        </div>
        <motion.div
          className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-muted border border-border/30"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <FileX2 className="size-4 text-muted-foreground" />
        </motion.div>
      </motion.div>

      <h3 className="mb-2 text-lg font-semibold text-foreground">No Open Holdings</h3>
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
        After processing trades, your open (unmatched) holdings will appear here. These represent
        crypto positions you still hold after FIFO matching.
      </p>
      <Button
        onClick={() => setCurrentView('upload')}
        className="rounded-xl bg-teal-600 text-white hover:bg-teal-700"
      >
        <Upload className="mr-2 h-4 w-4" />
        Go to Upload
      </Button>
    </div>
  )
}

function InfoBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400" />
      <p className="leading-relaxed text-muted-foreground">
        These are <span className="font-medium text-foreground">unmatched buy positions</span>{' '}
        remaining after FIFO matching. They represent your current open holdings that have not yet
        been sold or matched against sell transactions.
      </p>
    </div>
  )
}
