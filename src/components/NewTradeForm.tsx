'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
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
import { ChangeEvent, useCallback, useState } from 'react';
import { AssetType, Trade } from '@/types/trade';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const tradeSchema = z
  .object({
    // Common fields
    ticker: z.string().min(1, 'Simbol/Ticker tidak boleh kosong'),
    position: z.enum(['Long', 'Short']),
    journalNotes: z.string().optional(),

    // Simple mode fields
    pnl: z.coerce.number().optional(),

    // Advanced mode fields
    assetType: z.enum(['Saham', 'Kripto', 'Forex']).optional(),
    openDate: z.date().optional(),
    closeDate: z.date().optional(),
    entryPrice: z.coerce.number().optional(),
    exitPrice: z.coerce.number().optional(),
    positionSize: z.coerce.number().optional(),
    commission: z.coerce.number().optional(),
    strategy: z.string().optional(),
    executionRating: z.coerce.number().min(1).max(5).optional(),
  })
  .refine(
    (data) => {
      if (data.openDate && data.closeDate) {
        return data.closeDate > data.openDate;
      }
      return true;
    },
    {
      message: 'Tanggal tutup harus setelah tanggal buka.',
      path: ['closeDate'],
    }
  )
  .superRefine((data, ctx) => {
    // Advanced mode validation
    if (data.pnl === undefined) {
      if (!data.assetType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tipe Aset tidak boleh kosong.', path: ['assetType'] });
      }
      if (!data.entryPrice) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Harga masuk harus diisi dan positif.', path: ['entryPrice'] });
      } else if (data.entryPrice <=0) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Harga masuk harus positif.', path: ['entryPrice'] });
      }
      if (!data.exitPrice) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Harga keluar harus diisi dan positif.', path: ['exitPrice'] });
      } else if (data.exitPrice <= 0) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Harga keluar harus positif.', path: ['exitPrice'] });
      }
      if (!data.positionSize) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ukuran posisi harus diisi dan positif.', path: ['positionSize'] });
      } else if (data.positionSize <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ukuran posisi harus positif.', path: ['positionSize'] });
      }
      if (data.exitPrice && data.entryPrice && data.exitPrice === data.entryPrice) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Harga keluar tidak boleh sama dengan harga masuk.', path: ['exitPrice'] });
      }
       if (data.commission === undefined || data.commission < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Komisi tidak boleh negatif.', path: ['commission'] });
      }
    }
    // Simple mode validation
    else {
       if (data.pnl === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'P&L harus diisi.', path: ['pnl'] });
       }
    }
  });


type TradeFormData = z.infer<typeof tradeSchema>;

interface NewTradeFormProps {
  onSuccess?: () => void;
}

export default function NewTradeForm({ onSuccess }: NewTradeFormProps) {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const { toast } = useToast();
  const { user } = useUser();
  const form = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      ticker: '',
      assetType: 'Saham',
      position: 'Long',
      commission: 0,
      strategy: '',
      journalNotes: '',
      executionRating: 5,
      openDate: undefined,
      closeDate: undefined,
      entryPrice: undefined,
      exitPrice: undefined,
      positionSize: undefined,
      pnl: undefined,
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
    setValue,
    trigger,
  } = form;

  const handleTickerBlur = useCallback(
    async (ticker: string) => {
      if (!user || !ticker) return;

      try {
        const tradesCollectionRef = collection(
          firestore,
          'users',
          user.uid,
          'trades'
        );
        const q = query(
          tradesCollectionRef,
          where('ticker', '==', ticker.toUpperCase()),
          limit(10) // Fetch a few recent ones to be safe
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const trades = querySnapshot.docs.map((doc) => doc.data() as Trade);
          // Sort on the client side to find the most recent trade
          trades.sort((a, b) => {
            const timeA = a.createdAt?.toMillis() || 0;
            const timeB = b.createdAt?.toMillis() || 0;
            return timeB - timeA;
          });

          const lastTrade = trades[0];
          const updates: { assetType?: AssetType; strategy?: string } = {};

          if (lastTrade.assetType) {
            setValue('assetType', lastTrade.assetType);
            updates.assetType = lastTrade.assetType;
          }

          const strategyToSet = lastTrade.strategy || '';
          setValue('strategy', strategyToSet);
          if (lastTrade.strategy) {
            updates.strategy = lastTrade.strategy;
          }

          if (Object.keys(updates).length > 0) {
            const description = [
              updates.assetType
                ? `Tipe aset diatur ke "${updates.assetType}"`
                : '',
              updates.strategy ? `Strategi diatur ke "${updates.strategy}"` : '',
            ]
              .filter(Boolean)
              .join('. ');

            toast({
              title: 'Template Terisi',
              description: `${description}.`,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching last trade by ticker:', error);
      }
    },
    [user, setValue, toast]
  );

  const onSubmit = async (data: TradeFormData) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Anda harus login untuk menyimpan trade.',
      });
      return;
    }

    let finalData: Omit<Trade, 'id' | 'createdAt'> & { createdAt?: any, userId: string };

    if (mode === 'simple') {
       if (data.pnl === undefined) return;
       const pnl = data.pnl;
       // Create dummy values for calculation
       const entryPrice = 1;
       const positionSize = 1;
       const exitPrice = data.position === 'Long' ? entryPrice + (pnl / positionSize) : entryPrice - (pnl / positionSize);
       
       finalData = {
        ticker: data.ticker.toUpperCase(),
        position: data.position,
        journalNotes: data.journalNotes || '',
        entryPrice: entryPrice,
        exitPrice: exitPrice,
        positionSize: positionSize,
        assetType: 'Saham', // Default value
        commission: 0,
        closeDate: new Date(), // Set to now
        userId: user.uid,
        createdAt: serverTimestamp(),
       }
    } else {
        // Advanced mode data processing
        if (data.entryPrice === undefined || data.exitPrice === undefined || data.positionSize === undefined || data.commission === undefined || !data.assetType) {
            toast({
                variant: 'destructive',
                title: 'Gagal Menyimpan',
                description: 'Mohon isi semua field yang wajib di mode Lanjutan.'
            });
            return;
        }

        finalData = {
            ...data,
            ticker: data.ticker.toUpperCase(),
            assetType: data.assetType,
            entryPrice: data.entryPrice,
            exitPrice: data.exitPrice,
            positionSize: data.positionSize,
            commission: data.commission,
            userId: user.uid,
            createdAt: serverTimestamp(),
        }
    }

    try {
      const tradesCollectionRef = collection(
        firestore,
        'users',
        user.uid,
        'trades'
      );
      await addDoc(tradesCollectionRef, finalData);

      toast({
        title: 'Sukses!',
        description: 'Trade baru berhasil disimpan.',
      });
      reset();
      if (onSuccess) {
        onSuccess();
      }
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
    <Tabs
      defaultValue="simple"
      className="w-full"
      onValueChange={(value) => setMode(value as 'simple' | 'advanced')}
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="simple">Simple</TabsTrigger>
        <TabsTrigger value="advanced">Lanjutan</TabsTrigger>
      </TabsList>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 mt-4">
          <TabsContent value="simple">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    name="pnl"
                    render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>P&L (dalam USD)</FormLabel>
                        <FormControl>
                        <Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} placeholder="e.g., 150.50" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="journalNotes"
                    render={({ field }) => (
                        <FormItem className="md:col-span-2">
                        <FormLabel>Catatan Jurnal (Opsional)</FormLabel>
                        <FormControl>
                            <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
          </TabsContent>
          <TabsContent value="advanced">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="ticker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Simbol/Ticker</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onBlur={() => handleTickerBlur(field.value)}
                      />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormLabel>Tanggal & Waktu Buka (Opsional)</FormLabel>
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
                              field.value ? format(field.value, 'HH:mm') : ''
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
                    <FormLabel>Tanggal & Waktu Tutup (Opsional)</FormLabel>
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
                            date <
                              (form.getValues('openDate') ||
                                new Date('1900-01-01'))
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
                              field.value ? format(field.value, 'HH:mm') : ''
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
                      <Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
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
                      <Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
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
                      <Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
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
                      <Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
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
                    <FormControl>
                      <Input
                        placeholder="cth. Breakout, Trend Following"
                        {...field}
                      />
                    </FormControl>
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
          </TabsContent>
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
    </Tabs>
  );
}
