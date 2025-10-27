'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@/firebase/provider';
import { firestore } from '@/firebase/config';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import useCollection from '@/hooks/use-collection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Trade {
  id: string;
  ticker: string;
  position: 'Long' | 'Short';
  exitPrice: number;
  entryPrice: number;
  positionSize: number;
  commission: number;
  closeDate: string | Timestamp;
  createdAt: Timestamp;
}

const calculatePnL = (trade: Trade) => {
  let pnl;
  if (trade.position === 'Long') {
    pnl = (trade.exitPrice - trade.entryPrice) * trade.positionSize - trade.commission;
  } else {
    pnl = (trade.entryPrice - trade.exitPrice) * trade.positionSize - trade.commission;
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

const formatDate = (date: string | Timestamp) => {
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  return d.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function TradeHistoryPage() {
  const { user } = useUser();
  const tradesQuery = useMemo(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'trades'),
            orderBy('createdAt', 'desc')
          )
        : null,
    [user]
  );
  const { data: trades, loading } = useCollection<Trade>(tradesQuery);


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Riwayat Trade</h1>
      </div>
      <Card>
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
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : trades && trades.length > 0 ? (
                trades.map((trade) => {
                  const pnl = calculatePnL(trade);
                  const isProfit = pnl >= 0;
                  return (
                    <TableRow key={trade.id} className={cn(isProfit ? 'bg-green-500/10' : 'bg-red-500/10')}>
                      <TableCell>{formatDate(trade.closeDate)}</TableCell>
                      <TableCell className="font-medium">{trade.ticker}</TableCell>
                      <TableCell>
                        <Badge variant={trade.position === 'Long' ? 'default' : 'destructive'} className={cn(trade.position === 'Long' ? 'bg-green-600' : 'bg-red-600', 'text-white')}>
                          {trade.position}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn('text-right font-mono', isProfit ? 'text-green-400' : 'text-red-400')}>
                        {formatCurrency(pnl)}
                      </TableCell>
                    </TableRow>
                  );
                })
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
    </div>
  );
}
