'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Activity, AlertTriangle, Power } from 'lucide-react';
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
  voltage: number;
  current: number;
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
      <div className="flex flex-col items-center justify-center h-64 gap-3 bg-surface border border-border rounded-3xl p-8">
        <Activity className="animate-spin text-teal-accent" size={32} />
        <div className="text-text-3 font-mono text-[11px] uppercase tracking-widest font-bold">Querying Meter Telemetry...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-accent/5 border border-red-accent/20 rounded-3xl p-6 text-center max-w-lg mx-auto">
        <div className="flex flex-col items-center gap-3 text-red-accent">
          <AlertTriangle size={36} />
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider">Bus Diagnostic Failure</h3>
          <p className="text-xs text-text-2 font-sans leading-relaxed">{error}</p>
          <button 
            onClick={loadMeters} 
            className="mt-2 px-5 py-2.5 bg-red-accent text-white rounded-full font-mono text-[10px] uppercase font-bold tracking-wider hover:bg-red-accent/90 transition-all cursor-pointer"
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-text-1">METERS CONTROLS</h1>
          <p className="text-xs text-text-2 mt-1 font-sans">
            {meters.length} meter{meters.length !== 1 ? 's' : ''} actively registered on local Modbus loop.
          </p>
        </div>

        <button
          onClick={() => router.push('/meters/register')}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-accent hover:bg-teal-accent/90 text-bg font-bold font-mono text-xs uppercase tracking-wider rounded-full transition-all shadow-sm cursor-pointer"
        >
          <Plus size={16} />
          Register Meter
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-surface border border-border rounded-3xl p-5 shadow-sm hover:border-teal-accent/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-3 text-[10px] font-bold uppercase tracking-wider font-mono">Nodes Online</p>
              <p className="text-2xl font-bold text-teal-accent font-mono mt-1.5">
                {meters.filter((m) => m.status === 'online').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-teal-accent/10 border border-teal-accent/20 flex items-center justify-center text-teal-accent">
              <Activity size={20} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-5 shadow-sm hover:border-red-accent/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-3 text-[10px] font-bold uppercase tracking-wider font-mono">Nodes Offline</p>
              <p className="text-2xl font-bold text-red-accent font-mono mt-1.5">
                {meters.filter((m) => m.status === 'offline').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-red-accent/10 border border-red-accent/20 flex items-center justify-center text-red-accent">
              <AlertTriangle size={20} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-5 shadow-sm hover:border-teal-accent/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-3 text-[10px] font-bold uppercase tracking-wider font-mono">Plant Net Load</p>
              <p className="text-2xl font-bold text-text-1 font-mono mt-1.5">
                {totalActivePower.toFixed(1)} <span className="text-sm font-normal text-text-3">kW</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-teal-accent/10 border border-teal-accent/20 flex items-center justify-center text-teal-accent">
              <Power size={20} strokeWidth={2.5} />
            </div>
          </div>
        </div>

      </div>

      {/* Meters Grid */}
      {meters.length === 0 ? (
        <div className="bg-surface border border-border rounded-3xl p-12 text-center shadow-sm max-w-xl mx-auto">
          <Power size={48} className="mx-auto text-text-3 mb-4" />
          <h3 className="text-base font-bold font-display text-text-1 mb-2">No Connected Nodes</h3>
          <p className="text-xs text-text-2 mb-6 font-sans max-w-sm mx-auto leading-relaxed">
            There are currently no active Modbus telemetry nodes registered in your IEMAS workspace.
          </p>
          <button
            onClick={() => router.push('/meters/register')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-accent hover:bg-teal-accent/90 text-bg font-bold font-mono text-xs uppercase tracking-wider rounded-full transition-all cursor-pointer"
          >
            <Plus size={16} />
            Register Local Meter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meters.map((meter) => (
            <MeterCard
              key={meter.meter_id}
              meter={meter}
              latestReading={meter.latestReading}
              status={meter.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
