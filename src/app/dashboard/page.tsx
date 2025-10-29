'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase';
import { firestore } from '@/firebase/config';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import useCollection from '@/hooks/use-collection';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Percent, Wallet, Goal, ShieldAlert, BadgeDollarSign, Scale } from 'lucide-react';
import { Trade } from '@/types/trade';
import useCurrency from '@/hooks/use-currency';

interface TradeAnalyticsSummary {
  totalNetPnl: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  totalGains: number;
  totalLosses: number;
  equityCurve: { date: string; equity: number }[];
  pnlPerAsset: { ticker: string; pnl: number }[];
}

// Assume PnL is calculated in USD
const calculatePnL = (trade: Trade) => {
  if (!trade.entryPrice || !trade.exitPrice || !trade.positionSize) return 0;
  let pnl;
  if (trade.position === 'Long') {
    pnl =
      (trade.exitPrice - trade.entryPrice) * trade.positionSize -
      (trade.commission || 0);
  } else {
    pnl =
      (trade.entryPrice - trade.exitPrice) * trade.positionSize -
      (trade.commission || 0);
  }
  return pnl;
};

const calculateAnalytics = (trades: Trade[]): TradeAnalyticsSummary => {
  if (!trades || trades.length === 0) {
    return {
      totalNetPnl: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      totalGains: 0,
      totalLosses: 0,
      equityCurve: [],
      pnlPerAsset: [],
    };
  }

  const tradesWithPnl = trades
    .filter(trade => trade.closeDate) // Only include trades with a close date
    .map(trade => ({
      ...trade,
      pnl: calculatePnL(trade),
      closeDateObject: new Date(trade.closeDate as any),
    }))
    .sort((a, b) => a.closeDateObject.getTime() - b.closeDateObject.getTime());
  
  if (tradesWithPnl.length === 0) {
     return {
      totalNetPnl: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      totalGains: 0,
      totalLosses: 0,
      equityCurve: [],
      pnlPerAsset: [],
    };
  }


  const totalNetPnl = tradesWithPnl.reduce((acc, trade) => acc + trade.pnl, 0);
  const winningTrades = tradesWithPnl.filter(trade => trade.pnl > 0);
  const losingTrades = tradesWithPnl.filter(trade => trade.pnl < 0);

  const winRate = (winningTrades.length / tradesWithPnl.length) * 100;
  
  const totalGains = winningTrades.reduce((acc, trade) => acc + trade.pnl, 0);
  const totalLosses = Math.abs(losingTrades.reduce((acc, trade) => acc + trade.pnl, 0));

  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : Infinity;
  const avgWin = winningTrades.length > 0 ? totalGains / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

  let cumulativeEquity = 0;
  const equityCurve = tradesWithPnl.map(trade => {
    cumulativeEquity += trade.pnl;
    return {
      date: trade.closeDateObject.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
      equity: cumulativeEquity,
    };
  });
  
  const pnlPerAsset = Object.values(tradesWithPnl.reduce((acc, trade) => {
    if (!acc[trade.ticker]) {
      acc[trade.ticker] = { ticker: trade.ticker, pnl: 0 };
    }
    acc[trade.ticker].pnl += trade.pnl;
    return acc;
  }, {} as Record<string, { ticker: string; pnl: number }>));

  return {
    totalNetPnl,
    winRate,
    profitFactor,
    avgWin,
    avgLoss,
    totalGains,
    totalLosses,
    equityCurve,
    pnlPerAsset,
  };
};

const formatCurrencyIDR = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

export default function DashboardPage() {
  const { user } = useUser();
  const { idrRate, loading: currencyLoading } = useCurrency();

  const tradesQuery = useMemo(
    () =>
      user
        ? query(collection(firestore, 'users', user.uid, 'trades'), orderBy('closeDate', 'asc'))
        : null,
    [user]
  );
  
  const { data: trades, loading: tradesLoading } = useCollection<Trade>(tradesQuery);
  const analytics = useMemo(() => trades ? calculateAnalytics(trades) : null, [trades]);

  const loading = tradesLoading || currencyLoading;

  const KPI_CARDS = useMemo(() => [
    {
      title: 'Ekuitas (P&L Bersih)',
      key: 'totalNetPnl',
      icon: Wallet,
      format: (v: number) => formatCurrencyIDR(v * idrRate),
      subValue: (v: number) => formatCurrencyUSD(v),
    },
     {
      title: 'Total Keuntungan',
      key: 'totalGains',
      icon: TrendingUp,
      format: (v: number) => formatCurrencyIDR(v * idrRate),
      subValue: (v: number) => formatCurrencyUSD(v),
    },
    {
      title: 'Total Kerugian',
      key: 'totalLosses',
      icon: TrendingDown,
      format: (v: number) => formatCurrencyIDR(v * idrRate),
      subValue: (v: number) => formatCurrencyUSD(v),
    },
    {
      title: 'Win Rate',
      key: 'winRate',
      icon: Percent,
      format: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      title: 'Profit Factor',
      key: 'profitFactor',
      icon: Goal,
      format: (v: number) => isFinite(v) ? v.toFixed(2) : '∞',
    },
    {
      title: 'Rata-rata Kemenangan',
      key: 'avgWin',
      icon: BadgeDollarSign,
      format: (v: number) => formatCurrencyIDR(v * idrRate),
    },
    {
      title: 'Rata-rata Kerugian',
      key: 'avgLoss',
      icon: ShieldAlert,
      format: (v: number) => formatCurrencyIDR(v * idrRate),
    },
  ], [idrRate]);

  const renderKpiCards = () => {
    if (loading || !analytics) {
      return KPI_CARDS.map((card) => (
        <Card key={card.key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-3/4" />
             {card.subValue && <Skeleton className="h-4 w-1/2 mt-1" />}
          </CardContent>
        </Card>
      ));
    }

    return KPI_CARDS.map((card) => (
      <Card key={card.key}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          <card.icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {card.format((analytics as any)[card.key] || 0)}
          </div>
          {card.subValue && (
             <p className="text-xs text-muted-foreground">
                {card.subValue((analytics as any)[card.key] || 0)}
             </p>
          )}
        </CardContent>
      </Card>
    ));
  };
  
  const convertedEquityCurve = useMemo(() => {
    if (!analytics?.equityCurve) return [];
    return analytics.equityCurve.map(point => ({
        ...point,
        equity: point.equity * idrRate
    }));
  }, [analytics, idrRate]);

  const convertedPnlPerAsset = useMemo(() => {
    if (!analytics?.pnlPerAsset) return [];
    return analytics.pnlPerAsset.map(asset => ({
        ...asset,
        pnl: asset.pnl * idrRate
    }));
  }, [analytics, idrRate]);


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      
      {tradesLoading ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {renderKpiCards()}
          </div>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Kurva Ekuitas</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Skeleton className="h-[350px] w-full" />
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>P&L per Aset</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Skeleton className="h-[350px] w-full" />
              </CardContent>
            </Card>
          </div>
        </>
      ) : !analytics || !analytics.equityCurve || analytics.equityCurve.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-64">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              Belum ada data trade
            </h3>
            <p className="text-sm text-muted-foreground">
              Tambah trade baru untuk melihat analitik performa Anda.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {renderKpiCards()}
          </div>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Kurva Ekuitas</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer config={{}} className="h-[350px] w-full">
                  <ResponsiveContainer>
                    <LineChart data={convertedEquityCurve}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis tickFormatter={(value) => formatCurrencyIDR(value)} />
                      <Tooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatCurrencyIDR(Number(value))}
                          />
                        }
                      />
                      <Line
                        dataKey="equity"
                        type="monotone"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>P&L per Aset</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer config={{}} className="h-[350px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={convertedPnlPerAsset}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="ticker"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis tickFormatter={(value) => formatCurrencyIDR(value)} />
                      <Tooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatCurrencyIDR(Number(value))}
                          />
                        }
                      />
                      <Bar dataKey="pnl" radius={8}>
                        {convertedPnlPerAsset && convertedPnlPerAsset.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.pnl >= 0
                                ? 'hsl(var(--primary))'
                                : 'hsl(var(--destructive))'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
