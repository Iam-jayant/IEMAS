'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, Power, TrendingUp, Zap } from 'lucide-react';
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
  cumulative_energy?: number;
}

interface MeterWithStatus extends Meter {
  latestReading?: MeterReading;
  status: 'online' | 'offline' | 'unknown';
}

export default function DashboardPage() {
  // Fetch all registered meters
  const { data: meters = [], isLoading: metersLoading, error: metersError } = useQuery({
    queryKey: ['meters'],
    queryFn: () => api.get('/api/meters'),
    refetchInterval: 5000, // 5-second refetch interval
  });

  // Fetch latest readings for all meters
  const { data: readings = [], isLoading: readingsLoading, error: readingsError } = useQuery({
    queryKey: ['latest-readings'],
    queryFn: () => api.get('/api/readings/latest'),
    refetchInterval: 5000, // 5-second refetch interval
  });

  const isLoading = metersLoading || readingsLoading;
  const error = metersError || readingsError;

  // Combine meters with their latest readings and determine status
  const metersWithStatus: MeterWithStatus[] = meters.map((meter: Meter) => {
    const latestReading = readings.find((r: MeterReading) => r.meter_id === meter.meter_id);
    
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

  // Calculate aggregate metrics
  const onlineMeters = metersWithStatus.filter((m) => m.status === 'online');
  const totalActiveMeters = onlineMeters.length;
  
  const totalPower = onlineMeters
    .filter((m) => m.latestReading)
    .reduce((sum, m) => sum + (m.latestReading?.active_power || 0), 0);
  
  const avgPowerFactor = onlineMeters.length > 0
    ? onlineMeters
        .filter((m) => m.latestReading)
        .reduce((sum, m) => sum + (m.latestReading?.power_factor || 0), 0) / onlineMeters.length
    : 0;

  // Calculate total energy today (if available from cumulative_energy)
  const totalEnergyToday = onlineMeters
    .filter((m) => m.latestReading?.cumulative_energy)
    .reduce((sum, m) => sum + (m.latestReading?.cumulative_energy || 0), 0);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle size={20} />
          <span>Failed to load dashboard data. Please try again.</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (metersWithStatus.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <Power size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No meters registered</h3>
        <p className="text-gray-600 mb-6">
          Register your first meter to start monitoring energy consumption
        </p>
        <a
          href="/meters/register"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#019CDF] hover:bg-[#0284C7] text-white font-medium rounded transition-colors"
        >
          Register Meter
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Real-time monitoring of {metersWithStatus.length} meter{metersWithStatus.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Aggregate Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Meters */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-[#019CDF] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-medium">Active Meters</p>
            <Activity className="text-green-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalActiveMeters}</p>
          <p className="text-xs text-gray-500 mt-1">
            of {metersWithStatus.length} total
          </p>
        </div>

        {/* Total Power Consumption */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-[#019CDF] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-medium">Total Power</p>
            <Zap className="text-[#019CDF]" size={24} />
          </div>
          <p className="text-3xl font-bold text-[#019CDF]">
            {totalPower.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">kW</p>
        </div>

        {/* Average Power Factor */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-[#019CDF] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-medium">Avg Power Factor</p>
            <TrendingUp className="text-blue-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {avgPowerFactor.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {avgPowerFactor >= 0.85 ? 'Excellent' : avgPowerFactor >= 0.75 ? 'Good' : 'Needs Improvement'}
          </p>
        </div>

        {/* Total Energy Today */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-[#019CDF] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-medium">Total Energy</p>
            <Power className="text-orange-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {totalEnergyToday.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">kWh cumulative</p>
        </div>
      </div>

      {/* Meters Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Meters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metersWithStatus.map((meter) => (
            <MeterCard
              key={meter.meter_id}
              meter={meter}
              latestReading={meter.latestReading}
              status={meter.status}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
