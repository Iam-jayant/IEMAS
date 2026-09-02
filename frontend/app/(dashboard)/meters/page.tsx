'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Activity, AlertTriangle, Power, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import MeterCard from '@/components/MeterCard';

interface Meter {
  meter_id: string;
  name: string;
  location: string;
  created_at: string;
}

interface MeterReading {
  meter_id: string;
  timestamp: string;
  current_r: number;
  current_y: number;
  current_b: number;
  current_avg: number;
  voltage_ry: number;
  voltage_yb: number;
  voltage_br: number;
  voltage_ll_avg: number;
  voltage_rn: number;
  voltage_yn: number;
  voltage_bn: number;
  voltage_ln_avg: number;
  active_power: number;
  power_factor: number;
  frequency: number;
  firmware_version?: string;
  uptime_seconds?: number;
  wifi_rssi?: number;
}

interface MeterWithStatus extends Meter {
  latestReading?: MeterReading;
  status: 'online' | 'offline' | 'unknown';
}

export default function MetersPage() {
  const router = useRouter();
  const [meters, setMeters] = useState<MeterWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMeters();
  }, []);

  const loadMeters = async () => {
    try {
      setIsLoading(true);
      setError('');

      const metersData = await api.get('/api/meters');
      const readingsData = await api.get('/api/readings/latest');

      const metersWithStatus: MeterWithStatus[] = metersData.map((meter: Meter) => {
        const latestReading = readingsData.find((r: MeterReading) => r.meter_id === meter.meter_id);
        
        let status: 'online' | 'offline' | 'unknown' = 'unknown';
        if (latestReading) {
          const readingTime = new Date(latestReading.timestamp).getTime();
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          status = (now - readingTime < fiveMinutes) ? 'online' : 'offline';
        }

        return {
          ...meter,
          latestReading,
          status,
        };
      });

      setMeters(metersWithStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to load meters');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 glass rounded-md p-8">
        <Activity className="animate-spin text-teal-accent" size={28} />
        <div className="text-text-3 font-mono text-[10px] uppercase tracking-[0.2em] font-bold">
          Querying Meter Telemetry…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-md p-8 text-center max-w-lg mx-auto border border-red-accent/20">
        <div className="flex flex-col items-center gap-4 text-red-accent">
          <div className="w-12 h-12 rounded-sm bg-red-accent/10 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-xs font-bold font-mono uppercase tracking-[0.15em]">Connection Failure</h3>
          <p className="text-xs text-text-3 font-sans leading-relaxed max-w-xs">{error}</p>
          <button 
            onClick={loadMeters} 
            className="mt-2 px-5 py-2 bg-red-accent/10 text-red-accent border border-red-accent/20 rounded-sm font-mono text-[10px] uppercase font-bold tracking-wider hover:bg-red-accent/20 transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const totalActivePower = meters
    .filter((m) => m.latestReading)
    .reduce((sum, m) => sum + (m.latestReading?.active_power || 0), 0);

  const onlineCount = meters.filter((m) => m.status === 'online').length;
  const offlineCount = meters.filter((m) => m.status === 'offline').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold font-display text-text-1 tracking-wide">Meters</h1>
          <p className="text-xs text-text-3 mt-1">
            {meters.length} node{meters.length !== 1 ? 's' : ''} registered on Modbus network
          </p>
        </div>

        <button
          onClick={() => router.push('/meters/register')}
          className="flex items-center gap-2 px-4 py-2 bg-teal-accent/10 hover:bg-teal-accent/15 text-teal-accent border border-teal-accent/20 font-medium text-xs rounded-sm transition-all cursor-pointer"
        >
          <Plus size={15} />
          Register Meter
        </button>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Nodes Online */}
        <div className="glass rounded-md p-4 glow-teal transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-3 text-[10px] font-medium uppercase tracking-wider">Nodes Online</p>
              <p className="text-2xl font-bold text-teal-accent font-mono mt-1 tabular-nums">
                {onlineCount}
              </p>
            </div>
            <div className="w-9 h-9 rounded-sm bg-teal-accent/8 border border-teal-accent/15 flex items-center justify-center text-teal-accent group-hover:bg-teal-accent/12 transition-all">
              <Activity size={18} />
            </div>
          </div>
        </div>

        {/* Nodes Offline */}
        <div className="glass rounded-md p-4 glow-red transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-3 text-[10px] font-medium uppercase tracking-wider">Nodes Offline</p>
              <p className="text-2xl font-bold text-red-accent font-mono mt-1 tabular-nums">
                {offlineCount}
              </p>
            </div>
            <div className="w-9 h-9 rounded-sm bg-red-accent/8 border border-red-accent/15 flex items-center justify-center text-red-accent group-hover:bg-red-accent/12 transition-all">
              <AlertTriangle size={18} />
            </div>
          </div>
        </div>

        {/* Plant Net Load */}
        <div className="glass rounded-md p-4 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-3 text-[10px] font-medium uppercase tracking-wider">Plant Net Load</p>
              <p className="text-2xl font-bold text-text-1 font-mono mt-1 tabular-nums">
                {totalActivePower.toFixed(1)} <span className="text-sm font-normal text-text-3">kW</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-sm bg-surface-2 border border-border flex items-center justify-center text-text-3 group-hover:text-text-2 transition-all">
              <Zap size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Meters Grid */}
      {meters.length === 0 ? (
        <div className="glass rounded-md p-12 text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-sm bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <Power size={28} className="text-text-3" />
          </div>
          <h3 className="text-sm font-semibold text-text-1 mb-2">No Connected Nodes</h3>
          <p className="text-xs text-text-3 mb-6 max-w-sm mx-auto leading-relaxed">
            No active Modbus telemetry nodes registered in your IEMAS workspace.
          </p>
          <button
            onClick={() => router.push('/meters/register')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-accent/10 text-teal-accent border border-teal-accent/20 font-medium text-xs rounded-sm transition-all cursor-pointer hover:bg-teal-accent/15"
          >
            <Plus size={15} />
            Register Meter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {meters.map((meter, i) => (
            <div key={meter.meter_id} className="animate-fade-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <MeterCard
                meter={meter}
                latestReading={meter.latestReading}
                status={meter.status}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
