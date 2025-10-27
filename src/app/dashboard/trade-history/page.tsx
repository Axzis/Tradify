'use client';

import { useState, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { firestore } from '@/firebase/config';
import {
  collection,
  query,
  orderBy,
  Timestamp,
  doc,
  deleteDoc,
  limit,
} from 'firebase/firestore';
import useCollection from '@/hooks/use-collection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Star, Trash, Pencil, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Trade {
  id: string;
  ticker: string;
  position: 'Long' | 'Short';
  exitPrice: number;
  entryPrice: number;
  positionSize: number;
  commission: number;
  closeDate: Timestamp;
  openDate: Timestamp;
  createdAt: Timestamp;
  strategy?: string;
  journalNotes?: string;
  executionRating?: number;
  assetType: string;
}

const calculatePnL = (trade: Trade) => {
  let pnl;
  if (trade.position === 'Long') {
    pnl =
      (trade.exitPrice - trade.entryPrice) * trade.positionSize -
      trade.commission;
  } else {
    pnl =
      (trade.entryPrice - trade.exitPrice) * trade.positionSize -
      trade.commission;
  }
  return pnl;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatDate = (date: Timestamp) => {
  if (!date) return 'N/A';
  const d = date.toDate();
  return d.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RenderRating = memo(({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-4 w-4',
            i < rating
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-muted-foreground'
          )}
        />
      ))}
    </div>
  );
});
RenderRating.displayName = 'RenderRating';


const MemoizedTableRow = memo(({ trade, onRowClick }: { trade: Trade, onRowClick: (trade: Trade) => void }) => {
  const pnl = calculatePnL(trade);
  const isProfit = pnl >= 0;

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onRowClick(trade)}
    >
      <TableCell>{formatDate(trade.closeDate)}</TableCell>
      <TableCell className="font-medium">
        {trade.ticker}
      </TableCell>
      <TableCell>
        <Badge
          variant={
            trade.position === 'Long'
              ? 'default'
              : 'destructive'
          }
          className={cn(
            trade.position === 'Long'
              ? 'bg-green-600'
              : 'bg-red-600',
            'text-white hover:bg-green-700 hover:bg-red-700'
          )}
        >
          {trade.position}
        </Badge>
      </TableCell>
      <TableCell
        className={cn(
          'text-right font-mono',
          isProfit ? 'text-green-400' : 'text-red-400'
        )}
      >
        {formatCurrency(pnl)}
      </TableCell>
    </TableRow>
  );
});
MemoizedTableRow.displayName = 'MemoizedTableRow';

export default function TradeHistoryPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const tradesQuery = useMemo(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'trades'),
            orderBy('createdAt', 'desc'),
            limit(50)
          )
        : null,
    [user]
  );
  const { data: trades, loading } = useCollection<Trade>(tradesQuery);

  const handleRowClick = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsDetailDialogOpen(true);
  };

  const handleEdit = () => {
    if (!selectedTrade) return;
    // Redirect to an edit page (to be created)
    router.push(`/dashboard/edit-trade/${selectedTrade.id}`);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !selectedTrade) return;
    setIsDeleting(true);
    try {
      const tradeDocRef = doc(
        firestore,
        'users',
        user.uid,
        'trades',
        selectedTrade.id
      );
      await deleteDoc(tradeDocRef);
      toast({
        title: 'Sukses',
        description: 'Trade berhasil dihapus.',
      });
      setIsDeleteDialogOpen(false);
      setIsDetailDialogOpen(false);
      setSelectedTrade(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus',
        description: error.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">
          Riwayat Trade
        </h1>
      </div>
      <Card className="max-w-6xl w-full mx-auto">
        <CardHeader>
          <CardTitle>Transaksi Anda</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal Tutup</TableHead>
                <TableHead>Simbol</TableHead>
                <TableHead>Arah</TableHead>
                <TableHead className="text-right">P&L (Bersih)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-4 w-[150px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[50px]" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-[100px] ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : trades && trades.length > 0 ? (
                trades.map((trade) => (
                  <MemoizedTableRow key={trade.id} trade={trade} onRowClick={handleRowClick} />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Belum ada riwayat transaksi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedTrade && (
            <>
              <DialogHeader>
                <DialogTitle>Detail Trade: {selectedTrade.ticker}</DialogTitle>
                <DialogDescription>
                  {formatDate(selectedTrade.openDate)} -{' '}
                  {formatDate(selectedTrade.closeDate)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">P&L Bersih: </span>
                    <span
                      className={cn(
                        calculatePnL(selectedTrade) >= 0
                          ? 'text-green-400'
                          : 'text-red-400',
                        'font-semibold'
                      )}
                    >
                      {formatCurrency(calculatePnL(selectedTrade))}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipe Aset: </span>{' '}
                    {selectedTrade.assetType}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Arah: </span>{' '}
                    {selectedTrade.position}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Strategi: </span>
                    <Badge variant="secondary">
                      {selectedTrade.strategy || 'N/A'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rating: </span>
                    <RenderRating
                      rating={selectedTrade.executionRating || 0}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 border-t pt-4 mt-2">
                  <div>
                    <span className="text-muted-foreground block">
                      Harga Masuk
                    </span>{' '}
                    {formatCurrency(selectedTrade.entryPrice)}
                  </div>
                  <div>
                    <span className="text-muted-foreground block">
                      Harga Keluar
                    </span>{' '}
                    {formatCurrency(selectedTrade.exitPrice)}
                  </div>
                  <div>
                    <span className="text-muted-foreground block">
                      Ukuran Posisi
                    </span>{' '}
                    {selectedTrade.positionSize}
                  </div>
                </div>
                {selectedTrade.journalNotes && (
                  <div className="border-t pt-4 mt-2">
                    <h4 className="font-semibold mb-2">
                      Catatan Jurnal (Psikologi)
                    </h4>
                    <p className="text-muted-foreground bg-secondary/50 p-3 rounded-md whitespace-pre-wrap">
                      {selectedTrade.journalNotes}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isDeleting}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Hapus
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data trade
              secara permanen dari server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
