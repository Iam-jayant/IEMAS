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

      // Load meters
      const metersData = await api.get('/api/meters');

      // Load latest readings
      const readingsData = await api.get('/api/readings/latest');

      // Combine data
      const metersWithStatus: MeterWithStatus[] = metersData.map((meter: Meter) => {
        const latestReading = readingsData.find((r: MeterReading) => r.meter_id === meter.meter_id);
        
        // Determine status (online if reading within 5 minutes)
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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading meters...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meters</h1>
          <p className="text-gray-600 mt-1">
            {meters.length} meter{meters.length !== 1 ? 's' : ''} registered
          </p>
        </div>

        <button
          onClick={() => router.push('/meters/register')}
          className="flex items-center gap-2 px-4 py-2 bg-[#019CDF] hover:bg-[#0284C7] text-white font-medium rounded transition-colors"
        >
          <Plus size={20} />
          Register Meter
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Online</p>
              <p className="text-2xl font-bold text-green-600">
                {meters.filter((m) => m.status === 'online').length}
              </p>
            </div>
            <Activity className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Offline</p>
              <p className="text-2xl font-bold text-red-600">
                {meters.filter((m) => m.status === 'offline').length}
              </p>
            </div>
            <AlertTriangle className="text-red-500" size={32} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Power</p>
              <p className="text-2xl font-bold text-[#019CDF]">
                {meters
                  .filter((m) => m.latestReading)
                  .reduce((sum, m) => sum + (m.latestReading?.active_power || 0), 0)
                  .toFixed(1)}{' '}
                kW
              </p>
            </div>
            <Power className="text-[#019CDF]" size={32} />
          </div>
        </div>
      </div>

      {/* Meters Grid */}
      {meters.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Power size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No meters registered</h3>
          <p className="text-gray-600 mb-6">
            Register your first meter to start monitoring energy consumption
          </p>
          <button
            onClick={() => router.push('/meters/register')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#019CDF] hover:bg-[#0284C7] text-white font-medium rounded transition-colors"
          >
            <Plus size={20} />
            Register Meter
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
