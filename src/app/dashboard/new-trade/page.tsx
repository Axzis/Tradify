'use client';

import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { firestore } from '@/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { CalendarIcon, Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, setHours, setMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChangeEvent } from 'react';

const tradeSchema = z
  .object({
    ticker: z.string().min(1, 'Simbol/Ticker tidak boleh kosong'),
    assetType: z.enum(['Saham', 'Kripto', 'Forex']),
    openDate: z.date({
      required_error: 'Tanggal buka tidak boleh kosong.',
    }),
    closeDate: z.date({
      required_error: 'Tanggal tutup tidak boleh kosong.',
    }),
    position: z.enum(['Long', 'Short']),
    entryPrice: z.coerce.number().positive('Harga masuk harus positif'),
    exitPrice: z.coerce.number().positive('Harga keluar harus positif'),
    positionSize: z.coerce.number().positive('Ukuran posisi harus positif'),
    commission: z.coerce.number().min(0, 'Komisi tidak boleh negatif'),
    strategy: z
      .enum(['Breakout', 'Support/Resistance', 'Trend Following'])
      .optional(),
    journalNotes: z.string().optional(),
    executionRating: z.coerce.number().min(1).max(5),
  })
  .refine((data) => data.closeDate > data.openDate, {
    message: 'Tanggal tutup harus setelah tanggal buka.',
    path: ['closeDate'],
  })
  .refine((data) => data.exitPrice !== data.entryPrice, {
    message: 'Harga keluar tidak boleh sama dengan harga masuk.',
    path: ['exitPrice'],
  });

type TradeFormData = z.infer<typeof tradeSchema>;

export default function NewTradePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const form = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      assetType: 'Saham',
      position: 'Long',
      commission: 0,
      executionRating: 5,
      strategy: 'Breakout',
      journalNotes: '',
      ticker: '',
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

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
      let description = error.message;
      if (error.code === 'permission-denied') {
        description =
          'Anda tidak memiliki izin untuk menyimpan data. Pastikan Anda login dengan benar.';
      } else if (error.code === 'unavailable') {
        description =
          'Layanan tidak tersedia. Periksa koneksi internet Anda atau coba lagi nanti.';
      }
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan Trade',
        description,
      });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-4">
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
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="ticker"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Simbol/Ticker</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assetType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipe Aset</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih tipe aset" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Saham">Saham</SelectItem>
                            <SelectItem value="Kripto">Kripto</SelectItem>
                            <SelectItem value="Forex">Forex</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arah Posisi</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih arah posisi" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Long">Long</SelectItem>
                            <SelectItem value="Short">Short</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="openDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal & Waktu Buka</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP HH:mm')
                                ) : (
                                  <span>Pilih tanggal & waktu</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date('1900-01-01')
                              }
                              initialFocus
                            />
                            <div className="p-2 border-t border-border">
                              <Input
                                type="time"
                                step="60"
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                  const time = e.target.value;
                                  const [hours, minutes] = time.split(':');
                                  const newDate = setMinutes(
                                    setHours(
                                      field.value || new Date(),
                                      parseInt(hours)
                                    ),
                                    parseInt(minutes)
                                  );
                                  field.onChange(newDate);
                                }}
                                value={
                                  field.value
                                    ? format(field.value, 'HH:mm')
                                    : ''
                                }
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="closeDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal & Waktu Tutup</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP HH:mm')
                                ) : (
                                  <span>Pilih tanggal & waktu</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() ||
                                date < (form.getValues('openDate') || new Date('1900-01-01'))
                              }
                              initialFocus
                            />
                            <div className="p-2 border-t border-border">
                              <Input
                                type="time"
                                step="60"
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                  const time = e.target.value;
                                  const [hours, minutes] = time.split(':');
                                  const newDate = setMinutes(
                                    setHours(
                                      field.value || new Date(),
                                      parseInt(hours)
                                    ),
                                    parseInt(minutes)
                                  );
                                  field.onChange(newDate);
                                }}
                                value={
                                  field.value
                                    ? format(field.value, 'HH:mm')
                                    : ''
                                }
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="entryPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Harga Masuk</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Harga Keluar</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="positionSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ukuran Posisi</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="commission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Komisi & Biaya</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="strategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strategi/Setup</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih strategi" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Breakout">Breakout</SelectItem>
                            <SelectItem value="Support/Resistance">
                              Support/Resistance
                            </SelectItem>
                            <SelectItem value="Trend Following">
                              Trend Following
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="executionRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating Eksekusi</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(Number(v))}
                          defaultValue={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Beri rating 1-5" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((v) => (
                              <SelectItem key={v} value={String(v)}>
                                {v} Bintang
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="journalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan Jurnal (Psikologi)</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Simpan Trade
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
