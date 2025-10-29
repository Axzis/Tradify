'use client';

import NewTradeForm from '@/components/NewTradeForm';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function NewTradePage() {
  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">
          Tambah Trade Baru
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detail Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <NewTradeForm />
        </CardContent>
      </Card>
    </>
  );
}
