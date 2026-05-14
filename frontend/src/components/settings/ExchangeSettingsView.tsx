'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Info,
  RefreshCw,
  ArrowUpDown,
  AlertCircle,
  Building2,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { settingsApi } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────
interface ExchangeSetting {
  id: string;
  exchangeName: string;
  buyFeePercent: string;
  sellFeePercent: string;
  createdAt: string;
  updatedAt: string;
}

const COMMON_EXCHANGES = [
  'Binance',
  'CoinDCX',
  'WazirX',
  'Delta',
  'CoinSwitch',
  'ZebPay',
  'BuyUcoin',
  'Giottus',
];

// ── Recommended Fees ───────────────────────────────────────────────────
const RECOMMENDED_FEES: Record<string, { maker: string; taker: string }> = {
  Binance: { maker: '0.10', taker: '0.10' },
  CoinDCX: { maker: '0.10', taker: '0.30' },
  WazirX: { maker: '0.20', taker: '0.20' },
  Delta: { maker: '0.05', taker: '0.15' },
};

// ── Main Component ──────────────────────────────────────────────────────
export function ExchangeSettingsView() {
  const { activeWorkspace } = useWorkspaceStore();
  const [settings, setSettings] = useState<ExchangeSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formExchange, setFormExchange] = useState('');
  const [formBuyFee, setFormBuyFee] = useState('');
  const [formSellFee, setFormSellFee] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ExchangeSetting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline edit
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineBuyFee, setInlineBuyFee] = useState('');
  const [inlineSellFee, setInlineSellFee] = useState('');

  const workspaceId = activeWorkspace?.id;

  // ── Fetch Settings ──────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    if (!workspaceId) {
      setSettings([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await settingsApi.getExchangeSettings(workspaceId);
      setSettings(result.settings || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ── Open Add Dialog ─────────────────────────────────────────────────
  const openAddDialog = () => {
    setFormExchange('');
    setFormBuyFee('');
    setFormSellFee('');
    setEditingId(null);
    setShowAddDialog(true);
  };

  // ── Fill Recommended Fees ───────────────────────────────────────────
  const fillRecommended = (exchangeName: string) => {
    const fees = RECOMMENDED_FEES[exchangeName];
    if (fees) {
      setFormBuyFee(fees.maker);
      setFormSellFee(fees.taker);
      toast.success(`Filled recommended fees for ${exchangeName}`);
    }
  };

  // ── Save (Add or Edit) ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!formExchange.trim()) {
      toast.error('Exchange name is required');
      return;
    }
    if (!formBuyFee || isNaN(parseFloat(formBuyFee))) {
      toast.error('Valid buy fee percentage is required');
      return;
    }
    if (!formSellFee || isNaN(parseFloat(formSellFee))) {
      toast.error('Valid sell fee percentage is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await settingsApi.updateExchangeSetting(workspaceId!, editingId, {
          buyFeePercent: formBuyFee,
          sellFeePercent: formSellFee,
        });
        toast.success(`Updated ${formExchange} fee settings`);
      } else {
        await settingsApi.upsertExchangeSetting(workspaceId!, {
          exchangeName: formExchange.trim(),
          buyFeePercent: formBuyFee,
          sellFeePercent: formSellFee,
        });
        toast.success(`Added ${formExchange} exchange`);
      }
      setShowAddDialog(false);
      fetchSettings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Inline Save ─────────────────────────────────────────────────────
  const handleInlineSave = async (setting: ExchangeSetting) => {
    if (!inlineBuyFee || isNaN(parseFloat(inlineBuyFee))) {
      toast.error('Valid buy fee percentage is required');
      return;
    }
    if (!inlineSellFee || isNaN(parseFloat(inlineSellFee))) {
      toast.error('Valid sell fee percentage is required');
      return;
    }

    setIsSaving(true);
    try {
      await settingsApi.updateExchangeSetting(workspaceId!, setting.id, {
        buyFeePercent: inlineBuyFee,
        sellFeePercent: inlineSellFee,
      });
      toast.success(`Updated ${setting.exchangeName} fee settings`);
      setInlineEditId(null);
      fetchSettings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget || !workspaceId) return;

    setIsDeleting(true);
    try {
      await settingsApi.deleteExchangeSetting(workspaceId, deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.exchangeName} settings`);
      setDeleteTarget(null);
      fetchSettings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Start Inline Edit ───────────────────────────────────────────────
  const startInlineEdit = (setting: ExchangeSetting) => {
    setInlineEditId(setting.id);
    setInlineBuyFee(setting.buyFeePercent);
    setInlineSellFee(setting.sellFeePercent);
  };

  // ── Reset to Recommended for existing setting ───────────────────────
  const resetToRecommended = async (setting: ExchangeSetting) => {
    const fees = RECOMMENDED_FEES[setting.exchangeName];
    if (!fees) {
      toast.error(`No recommended fees available for ${setting.exchangeName}`);
      return;
    }
    setIsSaving(true);
    try {
      await settingsApi.updateExchangeSetting(workspaceId!, setting.id, {
        buyFeePercent: fees.maker,
        sellFeePercent: fees.taker,
      });
      toast.success(`Reset ${setting.exchangeName} to recommended fees`);
      if (inlineEditId === setting.id) {
        setInlineBuyFee(fees.maker);
        setInlineSellFee(fees.taker);
        setInlineEditId(null);
      }
      fetchSettings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if an exchange has recommended fees
  const hasRecommended = (name: string) => name in RECOMMENDED_FEES;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Exchange Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeWorkspace
              ? `${activeWorkspace.name} — Fee configuration`
              : 'Select a workspace to manage settings'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSettings}
            disabled={isLoading}
            className="rounded-xl text-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={openAddDialog}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Exchange
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                    <Building2 className="h-4 w-4 text-teal-600" />
                  </div>
                  {editingId ? 'Edit Exchange' : 'Add Exchange'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Exchange Name */}
                <div className="space-y-2">
                  <Label htmlFor="exchangeName" className="text-sm font-medium">
                    Exchange Name
                  </Label>
                  <Input
                    id="exchangeName"
                    placeholder="e.g., Binance"
                    value={formExchange}
                    onChange={(e) => setFormExchange(e.target.value)}
                    className="rounded-xl"
                    list="exchange-suggestions"
                  />
                  <datalist id="exchange-suggestions">
                    {COMMON_EXCHANGES.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                {/* Common exchange suggestions */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Common exchanges:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_EXCHANGES.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setFormExchange(name)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                          formExchange === name
                            ? 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-400'
                            : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:border-border/80'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fee Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buyFee" className="text-sm font-medium">
                      Buy Fee (Maker)
                    </Label>
                    <div className="relative">
                      <Input
                        id="buyFee"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.10"
                        value={formBuyFee}
                        onChange={(e) => setFormBuyFee(e.target.value)}
                        className="rounded-xl pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sellFee" className="text-sm font-medium">
                      Sell Fee (Taker)
                    </Label>
                    <div className="relative">
                      <Input
                        id="sellFee"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.10"
                        value={formSellFee}
                        onChange={(e) => setFormSellFee(e.target.value)}
                        className="rounded-xl pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Use Recommended button */}
                {formExchange && hasRecommended(formExchange) && (
                  <button
                    type="button"
                    onClick={() => fillRecommended(formExchange)}
                    className="flex items-center gap-2 text-xs text-teal-600 dark:text-teal-400 hover:underline w-fit"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Use recommended fees for {formExchange}
                  </button>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    className="rounded-xl text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm"
                  >
                    {isSaving ? 'Saving...' : editingId ? 'Update' : 'Add Exchange'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Recommended Fees Info Card */}
      <Card className="rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-teal-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10">
              <Sparkles className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recommended Fee Structure</h3>
              <p className="text-[11px] text-muted-foreground">Typical trading fees for popular exchanges</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(RECOMMENDED_FEES).map(([name, fees]) => (
              <div
                key={name}
                className="rounded-xl bg-background/80 border border-border/50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{name}</span>
                  <Badge
                    variant="secondary"
                    className="text-[9px] font-normal bg-teal-500/10 text-teal-700 dark:text-teal-400"
                  >
                    Popular
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Maker</span>
                  <span className="font-mono font-medium text-foreground">{fees.maker}%</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Taker</span>
                  <span className="font-mono font-medium text-foreground">{fees.taker}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 p-3">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-cyan-600 mt-0.5 shrink-0" />
          <p className="text-xs text-cyan-700 dark:text-cyan-400 leading-relaxed">
            Fee percentages are used to calculate exchange fees on your trades. Set to 0 if fees are already included in trade data.
            These fees affect your GST calculations and net profit computations.
          </p>
        </div>
      </div>

      {/* Error State */}
      {!isLoading && error && (
        <Card className="rounded-2xl border border-red-200 bg-red-50/50 dark:border-red-800/30 dark:bg-red-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load settings</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Settings List */}
      {!isLoading && !error && (
        <>
          {settings.length === 0 ? (
            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="relative mb-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500/10 to-orange-500/10">
                    <Settings className="h-10 w-10 text-muted-foreground" />
                  </div>
                  {/* Small exchange icons around */}
                  <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-muted border text-[10px] font-bold text-muted-foreground">
                    B
                  </div>
                  <div className="absolute -bottom-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-muted border text-[9px] font-bold text-muted-foreground">
                    C
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Exchange Settings</h3>
                <p className="text-sm text-muted-foreground max-w-[360px] mb-6">
                  Configure fee percentages for your cryptocurrency exchanges to ensure accurate tax calculations.
                </p>
                <Button
                  onClick={openAddDialog}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add First Exchange
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span>{settings.length} exchange{settings.length !== 1 ? 's' : ''} configured</span>
                <Badge variant="outline" className="ml-1 text-[10px] font-normal">
                  {COMMON_EXCHANGES.filter((e) => settings.some((s) => s.exchangeName === e)).length} popular
                </Badge>
              </div>

              {settings.map((setting) => {
                const isFreeTier =
                  parseFloat(setting.buyFeePercent) === 0 && parseFloat(setting.sellFeePercent) === 0;
                const hasRec = hasRecommended(setting.exchangeName);

                return (
                  <Card
                    key={setting.id}
                    className="rounded-2xl border shadow-sm transition-all hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      {inlineEditId === setting.id ? (
                        /* Inline Edit Mode */
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                              <Building2 className="h-5 w-5 text-orange-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {setting.exchangeName}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1.5">
                                  <Label className="text-xs text-muted-foreground">Buy:</Label>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={inlineBuyFee}
                                      onChange={(e) => setInlineBuyFee(e.target.value)}
                                      className="h-7 w-20 text-xs rounded-lg pr-6"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                      %
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Label className="text-xs text-muted-foreground">Sell:</Label>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={inlineSellFee}
                                      onChange={(e) => setInlineSellFee(e.target.value)}
                                      className="h-7 w-20 text-xs rounded-lg pr-6"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                      %
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setInlineEditId(null)}
                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleInlineSave(setting)}
                                disabled={isSaving}
                                className="h-8 w-8 p-0 rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-500/10"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {/* Recommended reset during inline edit */}
                          {hasRec && (
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const fees = RECOMMENDED_FEES[setting.exchangeName]!;
                                  setInlineBuyFee(fees.maker);
                                  setInlineSellFee(fees.taker);
                                  toast.success(`Filled recommended fees`);
                                }}
                                className="flex items-center gap-1.5 text-[11px] text-teal-600 dark:text-teal-400 hover:underline"
                              >
                                <Sparkles className="h-3 w-3" />
                                Use recommended ({RECOMMENDED_FEES[setting.exchangeName]!.maker}% / {RECOMMENDED_FEES[setting.exchangeName]!.taker}%)
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Display Mode */
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10">
                            <Building2 className="h-5 w-5 text-teal-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {setting.exchangeName}
                              </p>
                              {COMMON_EXCHANGES.includes(setting.exchangeName) && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-normal bg-teal-500/10 text-teal-700 dark:text-teal-400 shrink-0"
                                >
                                  Popular
                                </Badge>
                              )}
                              {isFreeTier && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-normal border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/5 shrink-0 gap-1"
                                >
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  Free tier — verify fees
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span>Buy:</span>
                                <span className="font-medium text-foreground">{setting.buyFeePercent}%</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span>Sell:</span>
                                <span className="font-medium text-foreground">{setting.sellFeePercent}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {hasRec && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resetToRecommended(setting)}
                                disabled={isSaving}
                                className="h-8 w-8 p-0 rounded-lg text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-500/10"
                                title="Reset to recommended fees"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startInlineEdit(setting)}
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(setting)}
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Delete Exchange Setting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the fee settings for{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.exchangeName}</span>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl text-sm"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl text-sm"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
