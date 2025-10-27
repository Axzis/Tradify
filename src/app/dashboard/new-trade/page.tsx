'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/provider';
import { firestore } from '@/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const tradeSchema = z.object({
  ticker: z.string().min(1, 'Simbol/Ticker tidak boleh kosong'),
  assetType: z.enum(['Saham', 'Kripto', 'Forex']),
  openDate: z.string().min(1, 'Tanggal buka tidak boleh kosong'),
  closeDate: z.string().min(1, 'Tanggal tutup tidak boleh kosong'),
  position: z.enum(['Long', 'Short']),
  entryPrice: z.coerce.number().positive('Harga masuk harus positif'),
  exitPrice: z.coerce.number().positive('Harga keluar harus positif'),
  positionSize: z.coerce.number().positive('Ukuran posisi harus positif'),
  commission: z.coerce.number().min(0, 'Komisi tidak boleh negatif'),
});

type TradeFormData = z.infer<typeof tradeSchema>;

export default function NewTradePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      assetType: 'Saham',
      position: 'Long',
      commission: 0,
    },
  });

  const onSubmit = async (data: TradeFormData) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Anda harus login untuk menyimpan trade.',
      });
      return;
    }

    try {
      const tradesCollectionRef = collection(
        firestore,
        'users',
        user.uid,
        'trades'
      );
      await addDoc(tradesCollectionRef, {
        ...data,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Sukses!',
        description: 'Trade baru berhasil disimpan.',
      });
      reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan Trade',
        description: error.message,
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">
          Tambah Trade Baru
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detail Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Simbol/Ticker */}
              <div className="grid gap-2">
                <Label htmlFor="ticker">Simbol/Ticker</Label>
                <Input id="ticker" {...register('ticker')} />
                {errors.ticker && (
                  <p className="text-sm text-destructive">
                    {errors.ticker.message}
                  </p>
                )}
              </div>

              {/* Tipe Aset */}
              <div className="grid gap-2">
                <Label htmlFor="assetType">Tipe Aset</Label>
                <Controller
                  name="assetType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe aset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Saham">Saham</SelectItem>
                        <SelectItem value="Kripto">Kripto</SelectItem>
                        <SelectItem value="Forex">Forex</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Arah Posisi */}
              <div className="grid gap-2">
                <Label htmlFor="position">Arah Posisi</Label>
                 <Controller
                  name="position"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih arah posisi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Long">Long</SelectItem>
                        <SelectItem value="Short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              
              {/* Tanggal & Waktu Buka */}
              <div className="grid gap-2">
                <Label htmlFor="openDate">Tanggal & Waktu Buka</Label>
                <Input
                  id="openDate"
                  type="datetime-local"
                  {...register('openDate')}
                />
                {errors.openDate && (
                  <p className="text-sm text-destructive">
                    {errors.openDate.message}
                  </p>
                )}
              </div>
              
              {/* Tanggal & Waktu Tutup */}
              <div className="grid gap-2">
                <Label htmlFor="closeDate">Tanggal & Waktu Tutup</Label>
                <Input
                  id="closeDate"
                  type="datetime-local"
                  {...register('closeDate')}
                />
                {errors.closeDate && (
                  <p className="text-sm text-destructive">
                    {errors.closeDate.message}
                  </p>
                )}
              </div>

              {/* Harga Masuk */}
              <div className="grid gap-2">
                <Label htmlFor="entryPrice">Harga Masuk</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="any"
                  {...register('entryPrice')}
                />
                {errors.entryPrice && (
                  <p className="text-sm text-destructive">
                    {errors.entryPrice.message}
                  </p>
                )}
              </div>

              {/* Harga Keluar */}
              <div className="grid gap-2">
                <Label htmlFor="exitPrice">Harga Keluar</Label>
                <Input
                  id="exitPrice"
                  type="number"
                  step="any"
                  {...register('exitPrice')}
                />
                {errors.exitPrice && (
                  <p className="text-sm text-destructive">
                    {errors.exitPrice.message}
                  </p>
                )}
              </div>

              {/* Ukuran Posisi */}
              <div className="grid gap-2">
                <Label htmlFor="positionSize">Ukuran Posisi</Label>
                <Input
                  id="positionSize"
                  type="number"
                  step="any"
                  {...register('positionSize')}
                />
                {errors.positionSize && (
                  <p className="text-sm text-destructive">
                    {errors.positionSize.message}
                  </p>
                )}
              </div>
              
              {/* Komisi & Biaya */}
              <div className="grid gap-2">
                <Label htmlFor="commission">Komisi & Biaya</Label>
                <Input
                  id="commission"
                  type="number"
                  step="any"
                  {...register('commission')}
                />
                {errors.commission && (
                  <p className="text-sm text-destructive">
                    {errors.commission.message}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
                <Button type="submit">Simpan Trade</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
