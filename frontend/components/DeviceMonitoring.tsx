'use client';

import { useQuery } from '@tanstack/react-query';
import { Cpu, Clock, Wifi, HardDrive, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

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

interface DeviceMonitoringProps {
  meterId: string;
  className?: string;
}

export default function DeviceMonitoring({ meterId, className = '' }: DeviceMonitoringProps) {
  const { data: readings = [], isLoading, error } = useQuery<MeterReading[]>({
    queryKey: ['latest-readings', meterId],
    queryFn: () => api.get('/api/readings/latest'),
    refetchInterval: 10000,
  });

  const reading = readings.find((r) => r.meter_id === meterId);

  const formatUptime = (seconds?: number): string => {
    if (!seconds && seconds !== 0) return 'N/A';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 && days === 0 && hours === 0) parts.push(`${secs}s`);
    
    return parts.length > 0 ? parts.join(' ') : '0s';
  };

  const formatSignalStrength = (rssi?: number): { text: string; quality: 'excellent' | 'good' | 'fair' | 'weak' } => {
    if (rssi === undefined || rssi === null) return { text: 'N/A', quality: 'weak' };
    if (rssi >= -50) return { text: `${rssi} dBm`, quality: 'excellent' };
    if (rssi >= -60) return { text: `${rssi} dBm`, quality: 'good' };
    if (rssi >= -70) return { text: `${rssi} dBm`, quality: 'fair' };
    return { text: `${rssi} dBm`, quality: 'weak' };
  };

  const getSignalQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
      case 'good':
        return 'text-teal-accent bg-teal-accent/10 border border-teal-accent/20';
      case 'fair':
        return 'text-amber-accent bg-amber-accent/10 border border-amber-accent/20';
      case 'weak':
      default:
        return 'text-red-accent bg-red-accent/10 border border-red-accent/20';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-surface border border-border rounded-3xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="text-text-3" size={20} />
          <h3 className="text-sm font-bold font-display text-text-1 uppercase tracking-wider">ESP32 Gateway Telemetry</h3>
        </div>
        <div className="text-text-3 font-mono text-[10px] uppercase font-bold animate-pulse">Polling Edge Node Status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-surface border border-border rounded-3xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="text-red-accent" size={20} />
          <h3 className="text-sm font-bold font-display text-text-1 uppercase tracking-wider">ESP32 Gateway Telemetry</h3>
        </div>
        <div className="flex items-center gap-2 text-red-accent font-mono text-[10px] uppercase font-bold">
          <AlertCircle size={16} />
          <span>Failed to link gateway diagnostics</span>
        </div>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className={`bg-surface border border-border rounded-3xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="text-text-3" size={20} />
          <h3 className="text-sm font-bold font-display text-text-1 uppercase tracking-wider">ESP32 Gateway Telemetry</h3>
        </div>
        <div className="text-center py-6 text-text-3 font-mono text-[10px] uppercase font-bold bg-surface-2 border border-border rounded-2xl">
          No edge statistics transmitted
        </div>
      </div>
    );
  }

  const signalInfo = formatSignalStrength(reading.wifi_rssi);
  const hasDeviceMetrics = reading.firmware_version || reading.uptime_seconds !== undefined || reading.wifi_rssi !== undefined;

  return (
    <div className={`bg-surface border border-border rounded-3xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5 border-b border-border pb-3.5">
        <Cpu className="text-teal-accent" size={20} />
        <h3 className="text-sm font-bold font-display text-text-1 uppercase tracking-wider">ESP32 Edge Gateway Monitoring</h3>
      </div>

      {hasDeviceMetrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Firmware */}
          <div className="p-4 bg-surface-2 border border-border rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="text-text-3" size={16} />
              <h4 className="font-bold text-text-2 text-[10px] uppercase tracking-wider font-mono">Gateway Firmware</h4>
            </div>
            <p className="text-xl font-bold font-mono text-text-1 leading-none mt-1">
              {reading.firmware_version || 'Unknown'}
            </p>
            <p className="text-[9px] text-text-3 font-mono mt-2">Active Modbus logic</p>
          </div>

          {/* Uptime */}
          <div className="p-4 bg-surface-2 border border-border rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-text-3" size={16} />
              <h4 className="font-bold text-text-2 text-[10px] uppercase tracking-wider font-mono">Device Uptime</h4>
            </div>
            <p className="text-xl font-bold font-mono text-text-1 leading-none mt-1">
              {formatUptime(reading.uptime_seconds)}
            </p>
            <p className="text-[9px] text-text-3 font-mono mt-2">
              {reading.uptime_seconds ? `${reading.uptime_seconds.toLocaleString()}s elapsed` : 'N/A'}
            </p>
          </div>

          {/* WiFi Signal */}
          <div className="p-4 bg-surface-2 border border-border rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="text-text-3" size={16} />
              <h4 className="font-bold text-text-2 text-[10px] uppercase tracking-wider font-mono">WiFi Signal RSSI</h4>
            </div>
            {reading.wifi_rssi !== undefined && reading.wifi_rssi !== null ? (
              <div>
                <p className="text-xl font-bold font-mono text-text-1 leading-none mt-1">
                  {signalInfo.text}
                </p>
                <span className={`inline-block mt-2 px-2 py-0.5 border rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${getSignalQualityColor(signalInfo.quality)}`}>
                  {signalInfo.quality}
                </span>
              </div>
            ) : (
              <div>
                <p className="text-xl font-bold font-mono text-text-3 leading-none mt-1">N/A</p>
                <p className="text-[9px] text-text-3 font-mono mt-2">No RSSI telemetry</p>
              </div>
            )}
          </div>

          {/* Last Beat */}
          <div className="p-4 bg-surface-2 border border-border rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-text-3" size={16} />
              <h4 className="font-bold text-text-2 text-[10px] uppercase tracking-wider font-mono">Gateway Handshake</h4>
            </div>
            <p className="text-xs font-bold font-mono text-text-1 leading-relaxed mt-1">
              {new Date(reading.timestamp).toLocaleString()}
            </p>
            <p className="text-[9px] text-text-3 font-mono mt-1.5 truncate">
              {new Date(reading.timestamp).toISOString()}
            </p>
          </div>

        </div>
      ) : (
        <div className="text-center py-6 bg-surface-2 border border-border rounded-2xl">
          <AlertCircle className="text-text-3 mx-auto mb-2" size={32} />
          <p className="text-text-2 font-mono text-xs uppercase font-bold">No Device Metrics Transmitted</p>
          <p className="text-text-3 text-[10px] font-sans mt-1">
            Telemetry data will appear when edge gateway dispatches payload packets.
          </p>
        </div>
      )}

      {/* Information Footer */}
      <div className="mt-5 pt-3.5 border-t border-border">
        <p className="text-[9px] font-mono text-text-3 leading-relaxed">
          <strong>NOTE:</strong> Edge gateway metrics are gathered by local ESP32 firmware packets over HTTP/JSON frames.
        </p>
      </div>
    </div>
  );
}
