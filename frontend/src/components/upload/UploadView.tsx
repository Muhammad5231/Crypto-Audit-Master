'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileWarning,
  Clock,
  Database,
  ArrowRight,
  Info,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  FileUp,
  PenLine,
  BarChart3,
  Eye,
  ChevronDown,
  ChevronUp,
  PanelBottomClose,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAppStore } from '@/store/appStore';
import { uploadApi, manualTradeApi, reportApi } from '@/lib/api';
import { formatDateTime, formatRelativeTime, formatFileSize } from '@/lib/utils/dateUtils';

// ── Types ────────────────────────────────────────────────────────────

interface UploadRecord {
  id: string;
  filename: string;
  exchangeName: string;
  parsedCount: number;
  skippedCount: number;
  warnings: string[];
  uploadedAt: string;
  createdAt?: string;
  fileSize: number;
  uploadStatus: string;

  previewHeaders?: string[];
  previewRows?: Record<string, any>[];
  previewTotalRows?: number;
}

interface ManualTrade {
  id: string;
  pair: string;
  side: string;
  quantity: string;
  price: string;
  fees: string;
  executedAt: string;
  csvFileId: string;
}

// ── Constants ────────────────────────────────────────────────────────

const INDIAN_EXCHANGES = [
  'CoinDCX',
  'WazirX',
  'CoinSwitchX',
  'ZebPay',
  'BitBNS',
  'Giottus',
  'BuyUcoin',
  'Unocoin',
  'Binance',
  'Coinbase',
  'KuCoin',
  'Other',
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ── Main Component ──────────────────────────────────────────────────

export function UploadView() {
  const { activeWorkspace } = useWorkspaceStore();
  const { setCurrentView } = useAppStore();
  const workspaceId = activeWorkspace?.id || (activeWorkspace as any)?._id;

  // ── State ──────────────────────────────────────────────────────────
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [isLoadingUploads, setIsLoadingUploads] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Upload form
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadSettings, setShowUploadSettings] = useState(false);
  const [uploadSettings, setUploadSettings] = useState({
    exchangeName: '',
    buyFeePercent: '0.1',
    sellFeePercent: '0.1',
  });

  // Manual trade form
  const [showManualTrade, setShowManualTrade] = useState(false);
  const [manualForm, setManualForm] = useState({
    pair: '',
    side: 'BUY',
    date: '',
    quantity: '',
    price: '',
    fee: '',
  });
  const [isCreatingTrade, setIsCreatingTrade] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<UploadRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch Uploads ──────────────────────────────────────────────────

  const fetchUploads = useCallback(async () => {
    if (!workspaceId) {
      setUploads([]);
      setIsLoadingUploads(false);
      return;
    }
    setIsLoadingUploads(true);
    try {
      const result = await uploadApi.list(workspaceId);
      setUploads(result.uploads || []);
    } catch {
      setUploads([]);
    } finally {
      setIsLoadingUploads(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  // Check pendingManualTrade from app store to auto-open manual trade form
  useEffect(() => {
    const pending = useAppStore.getState().pendingManualTrade;
    if (pending) {
      setShowManualTrade(true);
      useAppStore.getState().setPendingManualTrade(false);
    }
  }, []);

  // ── CSV Upload Handler ────────────────────────────────────────────

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Invalid file type', { description: 'Only CSV files are supported.' });
      return;
    }
    setSelectedFile(file);
    setUploadSettings({ exchangeName: '', buyFeePercent: '0.1', sellFeePercent: '0.1' });
    setShowUploadSettings(true);
  };

  const handleUpload = async () => {
    if (isUploading) return;

    if (!workspaceId) {
      toast.error('No workspace selected', {
        description: 'Please select or create a workspace first.',
      });
      return;
    }

    if (!selectedFile) {
      toast.error('No CSV selected', {
        description: 'Please select a CSV file first.',
      });
      return;
    }

    const exchangeName = uploadSettings.exchangeName.trim() || 'Default Exchange';
    const buyFeePercent = uploadSettings.buyFeePercent.trim() || '0';
    const sellFeePercent = uploadSettings.sellFeePercent.trim() || '0';

    if (Number.isNaN(Number(buyFeePercent)) || Number.isNaN(Number(sellFeePercent))) {
      toast.error('Invalid fee percentage', {
        description: 'Buy fee and sell fee must be valid numbers.',
      });
      return;
    }

    if (Number(buyFeePercent) < 0 || Number(sellFeePercent) < 0) {
      toast.error('Invalid fee percentage', {
        description: 'Fee percentage cannot be negative.',
      });
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadApi.upload(
        workspaceId,
        selectedFile,
        exchangeName,
        buyFeePercent,
        sellFeePercent
      );

      toast.success('Upload successful!', {
        description: `Parsed ${result.parsedCount || 0} trades${result.skippedCount > 0 ? `, skipped ${result.skippedCount}` : ''
          }.`,
      });

      setSelectedFile(null);
      setShowUploadSettings(false);
      setUploadSettings({
        exchangeName: '',
        buyFeePercent: '0.1',
        sellFeePercent: '0.1',
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await fetchUploads();

      try {
        const processResult = await reportApi.process(workspaceId);

        toast.success("Dashboard updated!", {
          description: `${processResult.realizedCount || 0} realized trades, ${processResult.holdingsCount || 0
            } open holdings.`,
        });

        setCurrentView("dashboard");
      } catch (processError: any) {
        toast.info("CSV uploaded, but processing needs manual click", {
          description: processError?.message || "Go to Dashboard and click Process Trades.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error('Upload failed', {
        description: message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ── Process Trades Handler ─────────────────────────────────────────

  const handleProcess = async () => {
    if (!workspaceId) return;

    setIsProcessing(true);
    try {
      const result = await reportApi.process(workspaceId);
      toast.success('Processing complete!', {
        description: `${result.realizedCount} realized trades, ${result.holdingsCount} open holdings.`,
      });

      if (result.warnings?.length > 0) {
        toast.info('Processing warnings', {
          description: result.warnings.slice(0, 3).join('\n'),
          duration: 6000,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Processing failed';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Delete Handler ─────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!workspaceId || !deleteTarget) return;

    setIsDeleting(true);
    try {
      await uploadApi.delete(workspaceId, deleteTarget.id);
      toast.success('File deleted', {
        description: `"${deleteTarget.filename}" and all associated trades removed.`,
      });
      setDeleteTarget(null);
      await fetchUploads();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Manual Trade Handler ──────────────────────────────────────────

  const handleCreateManualTrade = async () => {
    if (!workspaceId) return;
    const { pair, side, date, quantity, price } = manualForm;
    if (!pair || !side || !date || !quantity || !price) {
      toast.error('Missing fields', { description: 'Fill in all required fields.' });
      return;
    }

    setIsCreatingTrade(true);
    try {
      await manualTradeApi.create(workspaceId, {
        pair,
        side,
        date,
        quantity,
        price,
        fee: manualForm.fee || undefined,
      });

      toast.success('Trade added!', {
        description: `${side} ${quantity} ${pair.toUpperCase()} @ ₹${price}`,
      });

      setManualForm({ pair: '', side: 'BUY', date: '', quantity: '', price: '', fee: '' });
      setShowManualTrade(false);
      await fetchUploads();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create trade';
      toast.error(message);
    } finally {
      setIsCreatingTrade(false);
    }
  };

  // ── Drag & Drop ───────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // ── Derived ───────────────────────────────────────────────────────

  const totalTrades = uploads.reduce((sum, u) => sum + (u.parsedCount || 0), 0);
  const totalSkipped = uploads.reduce((sum, u) => sum + (u.skippedCount || 0), 0);
  const canUpload = Boolean(selectedFile && !isUploading);
  const canProcess = workspaceId && uploads.length > 0 && !isProcessing;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">
            Upload Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeWorkspace ? (
              <span>
                <span className="font-medium text-foreground">{activeWorkspace.name}</span>{' '}
                &mdash; FY {activeWorkspace.financialYear || 'All Time'}
              </span>
            ) : (
              'Select a workspace to upload files'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUploads}
            disabled={isLoadingUploads}
            className="rounded-xl text-xs gap-1.5 border-border/60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingUploads ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowManualTrade(true)}
            disabled={!workspaceId}
            className="rounded-xl text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
          >
            <PenLine className="h-3.5 w-3.5" />
            Add Manual Trade
          </Button>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4 lg:space-y-5"
      >
        {/* ── Upload Section ──────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border shadow-sm bg-gradient-to-br from-teal-500/5 via-card to-emerald-500/5 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                  <FileUp className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
                Upload CSV File
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Upload trade history from your exchange. Supported: CoinDCX, WazirX, Binance, and more.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 lg:p-8 cursor-pointer
                  transition-all duration-300
                  ${isDragging
                    ? 'border-teal-500 bg-teal-500/5 scale-[1.01]'
                    : selectedFile
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-border/60 hover:border-teal-500/40 hover:bg-muted/30'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />

                {selectedFile ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 mb-3">
                      <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(selectedFile.size)} &mdash; Ready to upload
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="mt-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Remove file
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <motion.div
                      animate={isDragging ? { scale: 1.1, y: -4 } : { y: [0, -4, 0] }}
                      transition={isDragging ? { duration: 0.2 } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 mb-3">
                        <Upload className="h-7 w-7 text-muted-foreground" />
                      </div>
                    </motion.div>
                    <p className="text-sm font-medium text-foreground">
                      {isDragging ? 'Drop your CSV here' : 'Drag & drop or click to browse'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only .csv files supported
                    </p>
                  </>
                )}
              </div>

              {/* Upload Button (exchange + fee settings open in popup after file selection) */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border/50 bg-muted/25 p-3">
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {selectedFile ? (
                    <>
                      File selected. Click <span className="font-medium text-foreground">Upload CSV</span> to open/edit exchange fee settings.
                    </>
                  ) : (
                    <>
                      Select a CSV file first. Exchange name and fallback fees will be asked in a popup.
                    </>
                  )}
                </div>
                <Button
                  onClick={() => selectedFile && setShowUploadSettings(true)}
                  disabled={!selectedFile || !workspaceId || isUploading}
                  className="w-full sm:w-auto rounded-xl px-6 bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 disabled:opacity-50 h-10"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FileUp className="h-4 w-4 mr-2" />
                      Upload CSV
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Quick Actions Row ──────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Process Trades */}
          <Card className="rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
            onClick={handleProcess}
          >
            <CardContent className="p-3.5 lg:p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/15 transition-colors">
                <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Process</p>
                <p className="text-[10px] text-muted-foreground">Run FIFO + Tax</p>
              </div>
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-emerald-500 shrink-0" />}
            </CardContent>
          </Card>

          {/* Stats: Files */}
          <Card className="rounded-xl border shadow-sm overflow-hidden">
            <CardContent className="p-3.5 lg:p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{uploads.length}</p>
                <p className="text-[10px] text-muted-foreground">CSV Files</p>
              </div>
            </CardContent>
          </Card>

          {/* Stats: Trades */}
          <Card className="rounded-xl border shadow-sm overflow-hidden">
            <CardContent className="p-3.5 lg:p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                <Database className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{totalTrades.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-muted-foreground">Trades Parsed</p>
              </div>
            </CardContent>
          </Card>

          {/* Stats: Skipped */}
          <Card className="rounded-xl border shadow-sm overflow-hidden">
            <CardContent className="p-3.5 lg:p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{totalSkipped}</p>
                <p className="text-[10px] text-muted-foreground">Skipped</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Info Banner ─────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5">
          <Info className="h-4 w-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Tip:</span> Upload your exchange CSV, then click{' '}
            <span className="font-medium text-foreground">Process</span> to run FIFO matching and tax calculations.
            You can also add trades manually using the button above.
          </div>
        </motion.div>

        {/* ── Upload History ───────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                    <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  Upload History
                  {uploads.length > 0 && (
                    <Badge variant="secondary" className="font-normal ml-1">{uploads.length}</Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUploads ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                    </div>
                  ))}
                </div>
              ) : uploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No files uploaded yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
                    Upload your first CSV file to get started with your crypto tax audit.
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[420px] overflow-y-auto">
                  <div className="space-y-2 pr-2">
                    <AnimatePresence>
                      {uploads.map((upload, index) => {
                        const isPreviewOpen = expandedPreviewId === upload.id;
                        const hasPreview =
                          Array.isArray(upload.previewHeaders) &&
                          upload.previewHeaders.length > 0 &&
                          Array.isArray(upload.previewRows) &&
                          upload.previewRows.length > 0;

                        return (
                          <motion.div
                            key={upload.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.03 }}
                            className="rounded-xl border border-border/40 hover:bg-muted/30 transition-colors group overflow-hidden"
                          >
                            <div className="flex items-center gap-3 p-3">
                              {/* Icon */}
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                                {upload.warnings?.length > 0 ? (
                                  <FileWarning className="h-5 w-5 text-orange-500" />
                                ) : (
                                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium text-foreground truncate max-w-[200px] lg:max-w-none">
                                    {upload.filename}
                                  </p>

                                  <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                                    {upload.exchangeName}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    {upload.parsedCount} trades
                                  </span>

                                  {upload.skippedCount > 0 && (
                                    <span className="flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3 text-orange-500" />
                                      {upload.skippedCount} skipped
                                    </span>
                                  )}

                                  <span>
                                    {formatRelativeTime(upload.uploadedAt || upload.createdAt || "")}
                                  </span>

                                  {hasPreview && (
                                    <span className="hidden sm:inline">
                                      Preview: {upload.previewRows?.length || 0} of{" "}
                                      {upload.previewTotalRows || upload.previewRows?.length || 0} rows
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* File size */}
                              <div className="hidden lg:block text-xs text-muted-foreground">
                                {formatFileSize(upload.fileSize)}
                              </div>

                              <div className="flex items-center gap-1 shrink-0 self-start pt-0.5">
                                {/* Preview Toggle */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    if (!hasPreview) {
                                      toast.info("Preview not available", {
                                        description:
                                          "Old uploaded CSV me preview data nahi hai. CSV delete karke dobara upload karo.",
                                      });
                                      return;
                                    }

                                    setExpandedPreviewId(isPreviewOpen ? null : upload.id);
                                  }}
                                  className={`
      flex h-8 w-8 items-center justify-center rounded-lg transition-all
      ${isPreviewOpen
                                      ? "bg-teal-500/15 text-teal-500"
                                      : "text-muted-foreground hover:text-teal-500 hover:bg-teal-500/10"
                                    }
    `}
                                  title={isPreviewOpen ? "Collapse preview" : "Preview CSV"}
                                >
                                  {isPreviewOpen ? (
                                    <PanelBottomClose className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(upload);
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                                  title="Delete file"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <AnimatePresence>
                              {isPreviewOpen && hasPreview && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-border/40 bg-background/40"
                                >
                                  <div className="p-3">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                      <p className="text-xs font-medium text-foreground">
                                        CSV Preview
                                      </p>
                                      <p className="text-[11px] text-muted-foreground">
                                        Showing first {upload.previewRows?.length || 0} rows
                                      </p>
                                    </div>

                                    <div className="rounded-xl border bg-background overflow-hidden">
                                      <div className="overflow-auto max-h-[520px] w-full">
                                        <div className="min-w-max">
                                          <table className="border-collapse text-xs">
                                            <thead className="sticky top-0 z-20 bg-muted">
                                              <tr>
                                                {upload.previewHeaders?.map((header) => (
                                                  <th
                                                    key={header}
                                                    className="
                  px-3 py-2 text-left font-semibold text-muted-foreground
                  border-b border-r last:border-r-0
                  whitespace-nowrap bg-muted
                "
                                                  >
                                                    {header}
                                                  </th>
                                                ))}
                                              </tr>
                                            </thead>

                                            <tbody>
                                              {upload.previewRows?.map((row, rowIndex) => (
                                                <tr
                                                  key={rowIndex}
                                                  className="border-b hover:bg-muted/30 transition-colors"
                                                >
                                                  {upload.previewHeaders?.map((header) => (
                                                    <td
                                                      key={`${rowIndex}-${header}`}
                                                      className="
                    px-3 py-2 border-r last:border-r-0
                    whitespace-nowrap align-top
                  "
                                                      title={String(row?.[header] ?? "")}
                                                    >
                                                      <div className="max-w-[260px] truncate">
                                                        {String(row?.[header] ?? "-")}
                                                      </div>
                                                    </td>
                                                  ))}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>

                                      <div className="border-t bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                                        Showing {upload.previewRows?.length || 0} rows from uploaded CSV
                                      </div>
                                    </div>

                                    <p className="mt-2 text-[11px] text-muted-foreground">
                                      This is only a simple preview of uploaded CSV data. Full file is
                                      processed by backend parser.
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Process Section ──────────────────────────────────────── */}
        {uploads.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="rounded-2xl border shadow-sm bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15">
                      <BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Ready to Process</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {totalTrades} trades from {uploads.length} file{uploads.length > 1 ? 's' : ''} loaded.
                        Run FIFO matching and generate tax report.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleProcess}
                    disabled={!canProcess}
                    className="rounded-xl px-8 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg shadow-teal-600/20 disabled:opacity-50 h-10 gap-2 shrink-0"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Process All Trades
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>


      {/* ── Upload Settings Dialog ────────────────────────────────── */}
      <Dialog open={showUploadSettings} onOpenChange={(open) => {
        if (!isUploading) setShowUploadSettings(open);
      }}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                <FileUp className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              CSV Upload Settings
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Enter exchange name and fallback fee percentages. If your CSV already contains fees, CSV fees will be used first and these percentages will not be double-counted.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            {selectedFile && (
              <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatFileSize(selectedFile.size)}</p>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label className="text-sm font-medium">Exchange Name *</Label>
              <Input
                placeholder="e.g. CoinDCX, WazirX, Binance"
                value={uploadSettings.exchangeName}
                onChange={(e) => setUploadSettings({ ...uploadSettings, exchangeName: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">Buy Fee %</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.1"
                  value={uploadSettings.buyFeePercent}
                  onChange={(e) => setUploadSettings({ ...uploadSettings, buyFeePercent: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">Sell Fee %</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.1"
                  value={uploadSettings.sellFeePercent}
                  onChange={(e) => setUploadSettings({ ...uploadSettings, sellFeePercent: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Fee rule:</span> CSV fee value = primary. If CSV fee is missing or 0, then this buy/sell fee percentage will be used during FIFO tax calculation.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUploadSettings(false)}
              disabled={isUploading}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!canUpload}
              className="rounded-xl gap-2 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  Confirm Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
              Delete File
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{deleteTarget?.filename}</span>?
              This will also remove all {deleteTarget?.parsedCount || 0} associated trades.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete File
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manual Trade Dialog ────────────────────────────────────── */}
      <Dialog open={showManualTrade} onOpenChange={setShowManualTrade}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                <PenLine className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              Add Manual Trade
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Manually add a buy or sell trade entry. It will be processed during the next FIFO run.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            {/* Pair */}
            <div className="grid gap-1.5">
              <Label className="text-sm font-medium">Trading Pair *</Label>
              <Input
                placeholder="e.g. BTC/INR"
                value={manualForm.pair}
                onChange={(e) => setManualForm({ ...manualForm, pair: e.target.value.toUpperCase() })}
                className="rounded-xl"
              />
            </div>

            {/* Side + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">Side *</Label>
                <Select
                  value={manualForm.side}
                  onValueChange={(val) => setManualForm({ ...manualForm, side: val })}
                >
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">
                      <span className="text-emerald-600 font-medium">BUY</span>
                    </SelectItem>
                    <SelectItem value="SELL">
                      <span className="text-red-500 font-medium">SELL</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">Date *</Label>
                <Input
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>
            </div>

            {/* Quantity + Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">Quantity *</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.001"
                  value={manualForm.quantity}
                  onChange={(e) => setManualForm({ ...manualForm, quantity: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">Price (INR) *</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="5250000"
                  value={manualForm.price}
                  onChange={(e) => setManualForm({ ...manualForm, price: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Fee (optional) */}
            <div className="grid gap-1.5">
              <Label className="text-sm font-medium text-muted-foreground">
                Fee (INR) <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                type="number"
                step="any"
                placeholder="0"
                value={manualForm.fee}
                onChange={(e) => setManualForm({ ...manualForm, fee: e.target.value })}
                className="rounded-xl"
              />
            </div>

            {/* Order Value Preview */}
            {manualForm.quantity && manualForm.price && (
              <div className="rounded-xl bg-muted/40 border border-border/40 p-3">
                <p className="text-xs text-muted-foreground">
                  Order Value:{' '}
                  <span className="font-semibold text-foreground">
                    ₹{(parseFloat(manualForm.quantity) * parseFloat(manualForm.price)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowManualTrade(false)}
              disabled={isCreatingTrade}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateManualTrade}
              disabled={
                isCreatingTrade ||
                !manualForm.pair ||
                !manualForm.date ||
                !manualForm.quantity ||
                !manualForm.price
              }
              className="rounded-xl gap-2 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isCreatingTrade ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Trade
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
