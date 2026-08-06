'use client';

import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '@/lib/api';

interface RealtimeChartProps {
  meterId: string;
  parameter: 'voltage' | 'current' | 'active_power' | 'power_factor' | 'frequency';
  timeRange: '1h' | '24h' | '7d' | '30d';
  title: string;
  color: string;
  unit: string;
}

interface MeterReading {
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

export function RealtimeChart({
  meterId,
  parameter,
  timeRange,
  title,
  color,
  unit,
}: RealtimeChartProps) {
  // Calculate start time based on time range
  const getStartTime = () => {
    const now = new Date();
    const startTime = new Date();

    switch (timeRange) {
      case '1h':
        startTime.setHours(now.getHours() - 1);
        break;
      case '24h':
        startTime.setHours(now.getHours() - 24);
        break;
      case '7d':
        startTime.setDate(now.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(now.getDate() - 30);
        break;
    }

    return startTime.toISOString();
  };

  // Fetch meter readings with auto-refresh every 5 seconds
  const { data: readings, isLoading, error } = useQuery<MeterReading[]>({
    queryKey: ['meter-readings', meterId, timeRange, parameter],
    queryFn: async () => {
      const startTime = getStartTime();
      return await api.get(
        `/api/readings?meter_id=${meterId}&start_time=${startTime}&limit=1000`
      );
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 4000, // Consider data stale after 4 seconds
  });

  // Format timestamp for display based on time range
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);

    switch (timeRange) {
      case '1h':
        // Show hours and minutes for 1h range
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case '24h':
        // Show hours and minutes for 24h range
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case '7d':
        // Show date and time for 7d range
        return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      case '30d':
        // Show date only for 30d range
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleTimeString();
    }
  };

  // Format tooltip timestamp to full format
  const formatTooltipTimestamp = (timestamp: any) => {
    return new Date(timestamp as string).toLocaleString();
  };

  // Loading state for queries exceeding 3 seconds
  if (isLoading) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center" style={{ height: 300 }}>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#019CDF]"></div>
            <p className="text-gray-600 mt-2">Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center" style={{ height: 300 }}>
          <div className="text-center text-red-600">
            <p>Failed to load chart data</p>
            <p className="text-sm text-gray-500 mt-1">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!readings || readings.length === 0) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center" style={{ height: 300 }}>
          <p className="text-gray-500">No data available for the selected time range</p>
        </div>
      </div>
    );
  }

  // Sort readings by timestamp ascending for chart display
  const sortedReadings = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Get parameter name for display
  const getParameterName = () => {
    switch (parameter) {
      case 'voltage':
        return 'Voltage';
      case 'current':
        return 'Current';
      case 'active_power':
        return 'Active Power';
      case 'power_factor':
        return 'Power Factor';
      case 'frequency':
        return 'Frequency';
      default:
        return parameter;
    }
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sortedReadings}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            label={{ value: unit, angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
            }}
            labelFormatter={formatTooltipTimestamp}
            formatter={(value: any) => [`${Number(value).toFixed(2)} ${unit}`, getParameterName()]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={parameter}
            stroke={color}
            strokeWidth={2}
            dot={false}
            name={`${getParameterName()} (${unit})`}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
