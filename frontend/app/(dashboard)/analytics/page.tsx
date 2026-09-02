'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Zap,
  Activity,
  Gauge,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

/**
 * IEMAS - Analytics Dashboard Page
 *
 * Aggregated energy analytics built from /api/readings/latest data.
 * Displays KPI cards, consumption trends, power distribution, and meter comparisons.
 */

interface Reading {
  id: number;
  meter_id: string;
  timestamp: string;
  voltage: number;
  current: number;
  active_power: number;
  reactive_power: number;
  apparent_power: number;
  power_factor: number;
  frequency: number;
  cumulative_energy: number;
}

// ─── Colour palette ────────────────────────────────────
const CHART_COLORS = ['#0D9488', '#7C3AED', '#D97706', '#E11D48', '#2563EB', '#059669'];

const AREA_GRADIENT_ID = 'areaGradient';

// ─── Helpers ───────────────────────────────────────────
function fmtNum(n: number, decimals = 1) {
  return n.toFixed(decimals);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ─── Group Readings by Hour for Trend Chart ─────────────
function buildTrendFromHistory(historical: Reading[]) {
  const hours: any[] = [];
  const now = new Date();
  
  // Create last 24 hours array ending at the current hour
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    hours.push({
      hourStr: `${String(d.getHours()).padStart(2, '0')}:00`,
      hourNum: d.getHours(),
      power: 0,
      energy: 0,
      count: 0
    });
  }
  
  historical.forEach(r => {
    const d = new Date(r.timestamp);
    const h = d.getHours();
    // Find matching hour block
    const target = hours.find(x => x.hourNum === h);
    if (target) {
      target.power += r.active_power;
      target.energy += r.cumulative_energy;
      target.count += 1;
    }
  });

  return hours.map(h => ({
    hour: h.hourStr,
    power: h.count > 0 ? +(h.power / h.count).toFixed(2) : 0,
    energy: h.count > 0 ? +(h.energy / h.count).toFixed(2) : 0,
  }));
}

export default function AnalyticsPage() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [latestRes, historyRes] = await Promise.all([
          api.get('/api/readings/latest'),
          // Fetch last 24 hours for the trend chart
          api.get(`/api/readings?start_time=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&limit=5000`)
        ]);
        
        if (latestRes) {
          setReadings(Array.isArray(latestRes) ? latestRes : latestRes.readings ?? []);
        }
        
        if (historyRes) {
          const historicalData = Array.isArray(historyRes) ? historyRes : (historyRes.readings ?? []);
          setTrendData(buildTrendFromHistory(historicalData));
        }
      } catch (err) {
        console.error('Failed to load analytics data', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Derived analytics ──────────────────────────────
  const analytics = useMemo(() => {
    if (!readings.length) return null;
    const totalPower = readings.reduce((s, r) => s + r.active_power, 0);
    const totalEnergy = readings.reduce((s, r) => s + r.cumulative_energy, 0);
    const avgVoltage = readings.reduce((s, r) => s + r.voltage, 0) / readings.length;
    const avgPF = readings.reduce((s, r) => s + r.power_factor, 0) / readings.length;
    const avgFreq = readings.reduce((s, r) => s + r.frequency, 0) / readings.length;
    const peak = readings.reduce((top, r) => (r.active_power > top.active_power ? r : top), readings[0]);
    return { totalPower, totalEnergy, avgVoltage, avgPF, avgFreq, peak };
  }, [readings]);

  // Per-meter bar data
  const meterBars = useMemo(
    () =>
      readings.map((r) => ({
        meter: r.meter_id,
        power: r.active_power,
        energy: r.cumulative_energy,
      })),
    [readings]
  );

  // Pie data for power distribution
  const pieData = useMemo(
    () =>
      readings.map((r) => ({
        name: r.meter_id,
        value: r.active_power,
      })),
    [readings]
  );

  // ── Loading state ──────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-teal-accent animate-pulse" />
          <span className="text-text-3 font-mono text-xs uppercase tracking-widest">Loading analytics…</span>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-text-3 mx-auto mb-3" />
          <p className="text-text-2 font-display font-bold text-lg">No Data Available</p>
          <p className="text-text-3 text-sm mt-1">Readings are required to generate analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {/* ───────── Page Header ───────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-1">Energy Analytics</h1>
          <p className="text-text-3 text-sm mt-0.5">Aggregated overview across {readings.length} active meters</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-text-3 font-mono">
          <Clock size={12} /> Last refresh: {readings[0] ? timeAgo(readings[0].timestamp) : '—'}
        </span>
      </div>

      {/* ───────── KPI Cards ───────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<Zap className="w-5 h-5" />}
          label="Total Active Power"
          value={`${fmtNum(analytics.totalPower)} kW`}
          accent="teal"
          delta={+5.3}
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Cumulative Energy"
          value={`${fmtNum(analytics.totalEnergy, 0)} kWh`}
          accent="violet"
          delta={+12.1}
        />
        <KPICard
          icon={<Gauge className="w-5 h-5" />}
          label="Avg Voltage"
          value={`${fmtNum(analytics.avgVoltage)} V`}
          accent="amber"
          delta={-0.8}
        />
        <KPICard
          icon={<Activity className="w-5 h-5" />}
          label="Avg Power Factor"
          value={fmtNum(analytics.avgPF, 2)}
          accent="teal"
          delta={+0.2}
        />
      </div>

      {/* ───────── Charts Row 1 ───────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Area – 24h Power Trend */}
        <div className="xl:col-span-2 bg-surface border border-border rounded-md p-5">
          <h3 className="text-sm font-display font-bold text-text-1 mb-4">24-Hour Power Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id={AREA_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D9488" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} unit=" kW" width={60} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
              <Area type="monotone" dataKey="power" stroke="#0D9488" strokeWidth={2} fill={`url(#${AREA_GRADIENT_ID})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie – Power Distribution */}
        <div className="bg-surface border border-border rounded-md p-5">
          <h3 className="text-sm font-display font-bold text-text-1 mb-4">Power Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                stroke="none"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: 'var(--text-2)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: 13,
                }}
                formatter={(val: any) => `${fmtNum(Number(val))} kW`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ───────── Charts Row 2 ───────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Bar – Per-Meter Active Power */}
        <div className="bg-surface border border-border rounded-md p-5">
          <h3 className="text-sm font-display font-bold text-text-1 mb-4">Active Power by Meter</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={meterBars} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="meter" tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} unit=" kW" width={55} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="power" radius={[8, 8, 0, 0]}>
                {meterBars.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar – Cumulative Energy by Meter */}
        <div className="bg-surface border border-border rounded-md p-5">
          <h3 className="text-sm font-display font-bold text-text-1 mb-4">Cumulative Energy by Meter</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={meterBars} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="meter" tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} unit=" kWh" width={65} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="energy" radius={[8, 8, 0, 0]}>
                {meterBars.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ───────── Meter Detail Table ───────── */}
      <div className="bg-surface border border-border rounded-md p-5 overflow-x-auto">
        <h3 className="text-sm font-display font-bold text-text-1 mb-4">Meter Readings Summary</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-text-3 text-xs font-mono uppercase tracking-wider">
              <th className="py-3 pr-4">Meter</th>
              <th className="py-3 pr-4">Voltage</th>
              <th className="py-3 pr-4">Current</th>
              <th className="py-3 pr-4">Power</th>
              <th className="py-3 pr-4">PF</th>
              <th className="py-3 pr-4">Freq</th>
              <th className="py-3">Energy</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r, i) => (
              <tr key={r.meter_id} className="border-b border-border/50 last:border-0 hover:bg-surface-2/50 transition-colors">
                <td className="py-3 pr-4 font-mono font-bold text-text-1 text-xs">{r.meter_id}</td>
                <td className="py-3 pr-4 font-mono text-text-2">{fmtNum(r.voltage)} V</td>
                <td className="py-3 pr-4 font-mono text-text-2">{fmtNum(r.current)} A</td>
                <td className="py-3 pr-4 font-mono text-text-2">{fmtNum(r.active_power)} kW</td>
                <td className="py-3 pr-4 font-mono text-text-2">{fmtNum(r.power_factor, 2)}</td>
                <td className="py-3 pr-4 font-mono text-text-2">{fmtNum(r.frequency)} Hz</td>
                <td className="py-3 font-mono text-text-2">{fmtNum(r.cumulative_energy, 0)} kWh</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── KPI Card ──────────────────────────────────────────
function KPICard({
  icon,
  label,
  value,
  accent,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: 'teal' | 'violet' | 'amber';
  delta: number;
}) {
  const accentMap = {
    teal: { bg: 'bg-teal-accent/10', text: 'text-teal-accent' },
    violet: { bg: 'bg-violet-accent/10', text: 'text-violet-accent' },
    amber: { bg: 'bg-amber-accent/10', text: 'text-amber-accent' },
  };

  const a = accentMap[accent];
  const isPositive = delta >= 0;

  return (
    <div className="bg-surface border border-border rounded-md p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`flex items-center justify-center w-9 h-9 rounded-md ${a.bg} ${a.text}`}>{icon}</span>
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold ${
            isPositive ? 'text-teal-accent' : 'text-red-accent'
          }`}
        >
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(delta)}%
        </span>
      </div>
      <div>
        <p className="text-text-3 text-xs font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-text-1 text-xl font-display font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}
