'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, Clock, AlertCircle, Signal, SignalHigh, SignalLow } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * IEMAS - Meter Status List Component
 * 
 * Displays connection status for all registered meters with last reading timestamp.
 * Marks meters as offline if no data received for 5+ minutes (per requirement 10.2).
 * Optionally displays ESP32 device information (firmware version, uptime, signal).
 * Industrial SCADA-inspired design with color-coded status indicators.
 */

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

interface MeterStatus {
  meter: Meter;
  lastReading?: MeterReading;
  status: 'online' | 'offline' | 'unknown';
  lastSeenMinutes?: number;
}

interface MeterStatusListProps {
  className?: string;
  showDeviceInfo?: boolean;
}

export default function MeterStatusList({ className = '', showDeviceInfo = false }: MeterStatusListProps) {
  // Fetch all registered meters
  const { data: meters = [], isLoading: metersLoading, error: metersError } = useQuery<Meter[]>({
    queryKey: ['meters'],
    queryFn: () => api.get('/api/meters'),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch latest readings for all meters
  const { data: readings = [], isLoading: readingsLoading, error: readingsError } = useQuery<MeterReading[]>({
    queryKey: ['latest-readings'],
    queryFn: () => api.get('/api/readings/latest'),
    refetchInterval: 5000, // Refresh every 5 seconds (real-time monitoring)
  });

  const isLoading = metersLoading || readingsLoading;
  const error = metersError || readingsError;

  // Calculate meter status based on last reading timestamp
  const meterStatuses: MeterStatus[] = meters.map((meter) => {
    const lastReading = readings.find((r) => r.meter_id === meter.meter_id);
    
    let status: 'online' | 'offline' | 'unknown' = 'unknown';
    let lastSeenMinutes: number | undefined;

    if (lastReading) {
      const readingTime = new Date(lastReading.timestamp).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      const timeDiff = now - readingTime;
      
      lastSeenMinutes = Math.floor(timeDiff / 60000);
      status = timeDiff < fiveMinutes ? 'online' : 'offline';
    }

    return {
      meter,
      lastReading,
      status,
      lastSeenMinutes,
    };
  });

  // Separate online and offline meters
  const onlineMeters = meterStatuses.filter((m) => m.status === 'online');
  const offlineMeters = meterStatuses.filter((m) => m.status === 'offline');
  const unknownMeters = meterStatuses.filter((m) => m.status === 'unknown');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <SignalHigh size={18} />;
      case 'offline':
        return <SignalLow size={18} />;
      default:
        return <Signal size={18} />;
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getSignalQuality = (rssi?: number) => {
    if (!rssi) return { quality: 'Unknown', color: 'text-gray-500', bars: 0 };
    
    // WiFi signal strength interpretation
    // Excellent: -50 dBm and higher (closer to 0)
    // Good: -60 dBm to -51 dBm
    // Fair: -70 dBm to -61 dBm
    // Weak: -80 dBm to -71 dBm
    // Very Weak: -90 dBm and lower
    
    if (rssi >= -50) return { quality: 'Excellent', color: 'text-green-600', bars: 5 };
    if (rssi >= -60) return { quality: 'Good', color: 'text-green-500', bars: 4 };
    if (rssi >= -70) return { quality: 'Fair', color: 'text-yellow-600', bars: 3 };
    if (rssi >= -80) return { quality: 'Weak', color: 'text-orange-500', bars: 2 };
    return { quality: 'Very Weak', color: 'text-red-500', bars: 1 };
  };

  const SignalStrengthBars = ({ rssi }: { rssi?: number }) => {
    const signal = getSignalQuality(rssi);
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={`w-1 ${bar <= signal.bars ? signal.color.replace('text-', 'bg-') : 'bg-gray-300'}`}
            style={{ height: `${bar * 3 + 3}px` }}
          />
        ))}
      </div>
    );
  };

  const getLastSeenText = (status: MeterStatus) => {
    if (!status.lastReading) return 'Never';
    if (status.lastSeenMinutes === 0) return 'Just now';
    if (status.lastSeenMinutes === 1) return '1 minute ago';
    if (status.lastSeenMinutes! < 60) return `${status.lastSeenMinutes} minutes ago`;
    
    const hours = Math.floor(status.lastSeenMinutes! / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white border-2 border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Activity className="text-gray-400" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">Meter Status</h3>
        </div>
        <div className="text-gray-500 text-sm">Loading meter statuses...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white border-2 border-red-500 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Activity className="text-red-500" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">Meter Status</h3>
        </div>
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle size={20} />
          <span className="text-sm">Failed to load meter statuses</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (meterStatuses.length === 0) {
    return (
      <div className={`bg-white border-2 border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Activity className="text-gray-400" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">Meter Status</h3>
        </div>
        <div className="text-center py-8 text-gray-500 text-sm">
          No meters registered yet
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border-2 border-gray-200 rounded-lg p-6 ${className}`}>
      {/* Header with summary counts */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="text-gray-700" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">Meter Status</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-gray-600">{onlineMeters.length} Online</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-gray-600">{offlineMeters.length} Offline</span>
          </span>
          {unknownMeters.length > 0 && (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-500"></span>
              <span className="text-gray-600">{unknownMeters.length} Unknown</span>
            </span>
          )}
        </div>
      </div>

      {/* Meter List */}
      <div className="space-y-2">
        {meterStatuses.map((meterStatus) => (
          <div
            key={meterStatus.meter.meter_id}
            className={`p-4 border-l-4 ${
              meterStatus.status === 'online'
                ? 'border-l-green-500 bg-green-50'
                : meterStatus.status === 'offline'
                ? 'border-l-red-500 bg-red-50'
                : 'border-l-gray-500 bg-gray-50'
            } rounded`}
          >
            <div className="flex items-start justify-between">
              {/* Meter Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={getStatusColor(meterStatus.status)}>
                    {getStatusIcon(meterStatus.status)}
                  </span>
                  <div>
                    <h4 className="font-semibold text-gray-900">{meterStatus.meter.name}</h4>
                    <p className="text-xs text-gray-600">{meterStatus.meter.location}</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">{meterStatus.meter.meter_id}</p>
                  </div>
                </div>

                {/* Last Reading Time */}
                <div className="flex items-center gap-2 text-xs text-gray-600 ml-9">
                  <Clock size={14} />
                  <span>Last reading: {getLastSeenText(meterStatus)}</span>
                  {meterStatus.lastReading && (
                    <span className="font-mono text-gray-500">
                      ({new Date(meterStatus.lastReading.timestamp).toLocaleString()})
                    </span>
                  )}
                </div>

                {/* ESP32 Device Info (optional) - Requirement 10.5, 10.6 */}
                {showDeviceInfo && meterStatus.lastReading && (
                  <div className="mt-3 ml-9 p-3 bg-gray-100 border border-gray-300 rounded">
                    <p className="text-xs font-semibold text-gray-700 mb-2">ESP32 Device Metrics</p>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {meterStatus.lastReading.firmware_version && (
                        <div>
                          <span className="text-gray-500">Firmware: </span>
                          <span className="font-mono text-gray-700">
                            v{meterStatus.lastReading.firmware_version}
                          </span>
                        </div>
                      )}
                      {meterStatus.lastReading.uptime_seconds !== undefined && (
                        <div>
                          <span className="text-gray-500">Uptime: </span>
                          <span className="font-mono text-gray-700">
                            {formatUptime(meterStatus.lastReading.uptime_seconds)}
                          </span>
                        </div>
                      )}
                      {meterStatus.lastReading.wifi_rssi !== undefined && (
                        <div>
                          <span className="text-gray-500">Signal: </span>
                          <div className="inline-flex items-center gap-2">
                            <SignalStrengthBars rssi={meterStatus.lastReading.wifi_rssi} />
                            <span className={`font-mono ${getSignalQuality(meterStatus.lastReading.wifi_rssi).color}`}>
                              {meterStatus.lastReading.wifi_rssi} dBm
                            </span>
                            <span className={`text-[10px] ${getSignalQuality(meterStatus.lastReading.wifi_rssi).color}`}>
                              ({getSignalQuality(meterStatus.lastReading.wifi_rssi).quality})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    {!meterStatus.lastReading.firmware_version && !meterStatus.lastReading.uptime_seconds && !meterStatus.lastReading.wifi_rssi && (
                      <p className="text-xs text-gray-500 italic">No device metrics available</p>
                    )}
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex-shrink-0 ml-4">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    meterStatus.status === 'online'
                      ? 'bg-green-100 text-green-700'
                      : meterStatus.status === 'offline'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusBgColor(meterStatus.status)}`}></span>
                  {meterStatus.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer - Auto-refresh notice */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
        Auto-refreshing every 5 seconds • Meters offline after 5 minutes without data
      </div>
    </div>
  );
}
