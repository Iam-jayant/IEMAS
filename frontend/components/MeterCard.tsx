'use client';

import { useRouter } from 'next/navigation';
import { Wifi, WifiOff, Cpu, Clock } from 'lucide-react';

/**
 * IEMAS - Meter Card Component
 * 
 * Displays real-time meter status and electrical parameters.
 * Industrial SCADA-inspired design for dashboard and meters list views.
 * Updated to use VoltSense/IEMAS light theme variables and typography.
 */

interface Meter {
  meter_id: string;
  name: string;
  location: string;
  created_at?: string;
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

interface MeterCardProps {
  meter: Meter;
  latestReading?: MeterReading;
  status: 'online' | 'offline' | 'unknown';
  onClick?: () => void;
}

export default function MeterCard({ meter, latestReading, status, onClick }: MeterCardProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-teal-accent shadow-[0_0_8px_rgba(13,148,136,0.4)]';
      case 'offline':
        return 'bg-red-accent shadow-[0_0_8px_rgba(225,29,72,0.4)]';
      default:
        return 'bg-text-3';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(' ') : '0m';
  };

  const getWiFiSignal = (rssi?: number): { label: string; color: string; Icon: typeof Wifi } => {
    if (!rssi) {
      return { label: 'Unknown', color: 'text-text-3', Icon: WifiOff };
    }
    if (rssi >= -60) {
      return { label: 'Good', color: 'text-teal-accent', Icon: Wifi };
    } else if (rssi >= -70) {
      return { label: 'Fair', color: 'text-amber-accent', Icon: Wifi };
    } else {
      return { label: 'Poor', color: 'text-red-accent', Icon: Wifi };
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/meters/${meter.meter_id}`);
    }
  };

  const wifiSignal = getWiFiSignal(latestReading?.wifi_rssi);

  return (
    <div
      onClick={handleClick}
      className="bg-surface border border-border hover:border-teal-accent/40 rounded-3xl p-5 cursor-pointer transition-all duration-300 hover:shadow-md flex flex-col justify-between"
    >
      {/* Header - Meter Name, Location, Status */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold font-display text-text-1 text-md leading-tight">{meter.name}</h3>
          <p className="text-xs text-text-2 mt-0.5">{meter.location}</p>
          <p className="text-[10px] text-text-3 font-mono font-bold mt-1 uppercase tracking-wider">{meter.meter_id}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 border border-border rounded-full select-none">
          <span
            className={`w-1.5 h-1.5 rounded-full ${getStatusColor(status)}`}
            aria-label={`Status: ${getStatusText(status)}`}
          ></span>
          <span className="text-[9px] text-text-2 font-mono uppercase font-bold tracking-wider">{getStatusText(status)}</span>
        </div>
      </div>

      {/* Electrical Parameters Grid */}
      {latestReading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="bg-surface-2 border border-border rounded-2xl p-3">
              <p className="text-text-3 text-[9px] uppercase tracking-wider font-bold font-mono">Voltage</p>
              <p className="font-mono font-bold text-text-1 text-base mt-1">
                {latestReading.voltage.toFixed(1)}<span className="text-xs text-text-3 font-normal ml-0.5">V</span>
              </p>
            </div>
            
            <div className="bg-surface-2 border border-border rounded-2xl p-3">
              <p className="text-text-3 text-[9px] uppercase tracking-wider font-bold font-mono">Current</p>
              <p className="font-mono font-bold text-text-1 text-base mt-1">
                {latestReading.current.toFixed(1)}<span className="text-xs text-text-3 font-normal ml-0.5">A</span>
              </p>
            </div>
            
            <div className="bg-teal-accent/5 border border-teal-accent/20 rounded-2xl p-3">
              <p className="text-teal-accent text-[9px] uppercase tracking-wider font-bold font-mono">Active Power</p>
              <p className="font-mono font-bold text-teal-accent text-base mt-1">
                {latestReading.active_power.toFixed(1)}<span className="text-xs opacity-75 font-normal ml-0.5">kW</span>
              </p>
            </div>
            
            <div className="bg-surface-2 border border-border rounded-2xl p-3">
              <p className="text-text-3 text-[9px] uppercase tracking-wider font-bold font-mono">Power Factor</p>
              <p className="font-mono font-bold text-text-1 text-base mt-1">
                {latestReading.power_factor.toFixed(2)}
              </p>
            </div>
          </div>

          {/* ESP32 Device Monitoring Section */}
          <div className="pt-3.5 border-t border-border">
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              {/* Firmware Version */}
              <div className="flex items-center gap-1.5">
                <Cpu size={14} className="text-text-3" />
                <div>
                  <p className="text-text-3 uppercase text-[8px] font-bold font-mono tracking-wider">FW</p>
                  <p className="font-mono text-text-2 font-bold leading-none mt-0.5">
                    {latestReading.firmware_version || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Uptime */}
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-text-3" />
                <div>
                  <p className="text-text-3 uppercase text-[8px] font-bold font-mono tracking-wider">Uptime</p>
                  <p className="font-mono text-text-2 font-bold leading-none mt-0.5">
                    {latestReading.uptime_seconds ? formatUptime(latestReading.uptime_seconds) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* WiFi Signal */}
              <div className="flex items-center gap-1.5">
                <wifiSignal.Icon size={14} className={wifiSignal.color} />
                <div>
                  <p className="text-text-3 uppercase text-[8px] font-bold font-mono tracking-wider">Signal</p>
                  <p className={`font-mono font-bold leading-none mt-0.5 ${wifiSignal.color}`}>
                    {latestReading.wifi_rssi ? `${latestReading.wifi_rssi} dB` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-text-3 font-mono text-[10px] uppercase font-bold py-6 bg-surface-2 border border-border rounded-2xl">
          No telemetry stream
        </div>
      )}

      {/* Footer - Last Update Timestamp */}
      {latestReading && (
        <div className="mt-3.5 pt-3 border-t border-border text-[9px] font-mono text-text-3 flex items-center justify-between">
          <span>LAST BEAT</span>
          <span className="font-bold">{new Date(latestReading.timestamp).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
