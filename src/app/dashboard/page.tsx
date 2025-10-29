'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase';
import { firestore } from '@/firebase/config';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase';
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
import { TrendingUp, TrendingDown, Percent, Wallet, Goal } from 'lucide-react';

// This interface now represents the pre-calculated summary document
interface TradeAnalyticsSummary {
  totalNetPnl: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  equityCurve: { date: string; equity: number }[];
  pnlPerAsset: { ticker: string; pnl: number }[];
}

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
    format: (v: number) => v.toFixed(2),
  },
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
  const analyticsDocRef = useMemo(
    () =>
      user
        ? doc(firestore, 'users', user.uid, 'analytics', 'summary')
        : null,
    [user]
  );
  
  const { data: analytics, loading } = useDoc<TradeAnalyticsSummary>(analyticsDocRef);

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
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">
          Dashboard
        </h1>
      </div>
      
        {loading ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                      <LineChart data={analytics.equityCurve}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => value.slice(0, 3)}
                        />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                        <Tooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              formatter={(value) => formatCurrency(Number(value))}
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
                      <BarChart data={analytics.pnlPerAsset}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="ticker"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                        <Tooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              formatter={(value) => formatCurrency(Number(value))}
                            />
                          }
                        />
                        <Bar dataKey="pnl" radius={8}>
                          {analytics.pnlPerAsset && analytics.pnlPerAsset.map((entry, index) => (
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
