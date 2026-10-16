import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Loader2, Sprout } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../ui/card';
import { useDashboard } from '../../services/DashboardContext';
import { useThemeColors } from '../../services/theme';

const periods: Array<{ label: string; value: 'weekly' | 'monthly' | 'yearly' }> = [
  { label: '7D', value: 'weekly' },
  { label: '30D', value: 'monthly' },
  { label: '1Y', value: 'yearly' }
];

export function ImpactChart() {
  const { chartData, loading, period, setPeriod } = useDashboard();
  // SVG attributes and Recharts props cannot read CSS variables, so the
  // palette is resolved here — useThemeColors() re-reads it on theme change.
  const colors = useThemeColors();

  const hasAnyData = chartData.some((d) => d.co2 > 0 || d.saved > 0);

  return (
    <Card className="col-span-1 lg:col-span-2 bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Impact Chart</CardTitle>
          <CardDescription>
            CO₂ emitted vs CO₂ saved per day. Built from your real activity log.
          </CardDescription>
        </div>
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-xs rounded-md transition-all font-medium ${
                period === p.value
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading && chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !hasAnyData ? (
          <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Sprout className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-medium">No activity in this period yet.</p>
            <p className="text-xs text-muted-foreground max-w-[280px]">
              Log a habit, scan a transit ticket or accept a coach suggestion. Your real impact will
              appear here automatically.
            </p>
          </div>
        ) : (
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.chartEmitted} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={colors.chartEmitted} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.chartSaved} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={colors.chartSaved} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="5 5"
                  stroke={colors.chartGrid}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke={colors.chartTick}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                  tick={{ fill: colors.chartTick }}
                />
                <YAxis
                  yAxisId="left"
                  stroke={colors.chartTick}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}kg`}
                  tick={{ fill: colors.chartEmitted }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={colors.chartTick}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}kg`}
                  tick={{ fill: colors.chartSaved }}
                />
                <Tooltip
                  cursor={{ stroke: colors.primary, strokeOpacity: 0.35 }}
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    color: 'var(--popover-foreground)',
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.35)',
                    padding: '12px',
                    borderWidth: '1px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="co2"
                  name="CO₂ Emitted"
                  stroke={colors.chartEmitted}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCo2)"
                  animationDuration={1500}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="saved"
                  name="CO₂ Saved"
                  stroke={colors.chartSaved}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSaved)"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

