'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase/provider';
import { firestore } from '@/firebase/config';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
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
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Percent, Wallet, Goal } from 'lucide-react';

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
  if (trade.position === 'Long') {
    return (
      (trade.exitPrice - trade.entryPrice) * trade.positionSize -
      trade.commission
    );
  }
  return (
    (trade.entryPrice - trade.exitPrice) * trade.positionSize -
    trade.commission
  );
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const KPI_CARDS = [
  {
    title: 'Total P&L Bersih',
    key: 'totalNetPnl',
    icon: Wallet,
    format: formatCurrency,
  },
  { title: 'Win Rate', key: 'winRate', icon: Percent, format: (v:number) => `${v.toFixed(2)}%` },
  { title: 'Profit Factor', key: 'profitFactor', icon: Goal, format: (v:number) => v.toFixed(2) },
  {
    title: 'Rata-rata Kemenangan',
    key: 'avgWin',
    icon: TrendingUp,
    format: formatCurrency,
  },
  {
    title: 'Rata-rata Kerugian',
    key: 'avgLoss',
    icon: TrendingDown,
    format: formatCurrency,
  },
];

export default function DashboardPage() {
  const { user } = useUser();
  const tradesQuery = useMemo(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'trades'),
            orderBy('createdAt', 'asc')
          )
        : null,
    [user]
  );
  const { data: trades, loading } = useCollection<Trade>(tradesQuery);

  const analytics = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        totalNetPnl: 0,
        winRate: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        avgRiskReward: 0,
        equityCurve: [],
        pnlPerAsset: [],
      };
    }

    const tradesWithPnl = trades.map((trade) => ({
      ...trade,
      pnl: calculatePnL(trade),
    }));

    let cumulativePnl = 0;
    const equityCurve = tradesWithPnl.map((trade) => {
      cumulativePnl += trade.pnl;
      const closeDate =
        trade.closeDate instanceof Timestamp
          ? trade.closeDate.toDate()
          : new Date(trade.closeDate);
      return {
        date: closeDate.toLocaleDateString('id-ID'),
        equity: cumulativePnl,
      };
    });

    const totalNetPnl = cumulativePnl;
    const winningTrades = tradesWithPnl.filter((t) => t.pnl > 0);
    const losingTrades = tradesWithPnl.filter((t) => t.pnl <= 0);

    const winRate =
      (winningTrades.length / trades.length) * 100;

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;

    const avgWin =
      winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss =
      losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
      
    // Simplified RRR calculation for example purposes
    const avgRiskReward = avgLoss > 0 ? avgWin / avgLoss : Infinity;

    const pnlPerAsset = tradesWithPnl.reduce((acc, trade) => {
      if (!acc[trade.ticker]) {
        acc[trade.ticker] = { ticker: trade.ticker, pnl: 0 };
      }
      acc[trade.ticker].pnl += trade.pnl;
      return acc;
    }, {} as Record<string, { ticker: string; pnl: number }>);

    return {
      totalNetPnl,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      avgRiskReward,
      equityCurve,
      pnlPerAsset: Object.values(pnlPerAsset),
    };
  }, [trades]);

  const renderKpiCards = () => {
    if (loading) {
      return KPI_CARDS.map((card) => (
        <Card key={card.key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-3/4" />
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
            {card.format((analytics as any)[card.key])}
          </div>
        </CardContent>
      </Card>
    ));
  };


  if (loading) {
     return (
        <>
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl font-headline">
              Dashboard
            </h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {renderKpiCards()}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
             <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Kurva Ekuitas</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                   <Skeleton className="h-[350px] w-full" />
                </CardContent>
              </Card>
               <Card className="col-span-4 lg:col-span-3">
                <CardHeader>
                  <CardTitle>P&L per Aset</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                   <Skeleton className="h-[350px] w-full" />
                </CardContent>
              </Card>
          </div>
        </>
     )
  }

  if (!trades || trades.length === 0) {
    return (
       <>
        <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl font-headline">
            Dashboard
            </h1>
        </div>
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
       </>
    )
  }

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">
          Dashboard
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">{renderKpiCards()}</div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Kurva Ekuitas</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={{}} className="h-[350px] w-full">
              <ResponsiveContainer>
                <LineChart data={analytics.equityCurve}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))}/>}
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
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>P&L per Aset</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={{}} className="h-[350px] w-full">
               <ResponsiveContainer>
                 <BarChart data={analytics.pnlPerAsset}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="ticker"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                     <Tooltip
                        cursor={false}
                        content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))}/>}
                    />
                    <Bar dataKey="pnl" radius={8}>
                        {analytics.pnlPerAsset.map((entry, index) => (
                            <Bar
                                key={`cell-${index}`}
                                fill={entry.pnl >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                                dataKey="pnl"
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
  );
}
