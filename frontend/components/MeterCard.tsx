'use client';

import { useRouter } from 'next/navigation';
import { Wifi, WifiOff, Cpu, Clock } from 'lucide-react';

/**
 * IEMAS - Meter Card Component
 * 
 * Displays real-time meter status and electrical parameters.
 * Dark industrial glassmorphism design.
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

interface MeterCardProps {
  meter: Meter;
  latestReading?: MeterReading;
  status: 'online' | 'offline' | 'unknown';
  onClick?: () => void;
}

export default function MeterCard({ meter, latestReading, status, onClick }: MeterCardProps) {
  const router = useRouter();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'online':
        return {
          dot: 'bg-teal-accent shadow-[0_0_6px_rgba(52,211,153,0.5)]',
          text: 'text-teal-accent',
          bg: 'bg-teal-accent/8 border-teal-accent/15',
          label: 'Online',
        };
      case 'offline':
        return {
          dot: 'bg-red-accent shadow-[0_0_6px_rgba(248,113,113,0.5)] animate-pulse',
          text: 'text-red-accent',
          bg: 'bg-red-accent/8 border-red-accent/15',
          label: 'Offline',
        };
      default:
        return {
          dot: 'bg-text-3',
          text: 'text-text-3',
          bg: 'bg-surface-2 border-border',
          label: 'Unknown',
        };
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

  const getWiFiSignal = (rssi?: number) => {
    if (!rssi) return { label: '—', color: 'text-text-3', Icon: WifiOff };
    if (rssi >= -60) return { label: 'Good', color: 'text-teal-accent', Icon: Wifi };
    if (rssi >= -70) return { label: 'Fair', color: 'text-amber-accent', Icon: Wifi };
    return { label: 'Poor', color: 'text-red-accent', Icon: Wifi };
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/meters/${meter.meter_id}`);
    }
  };

  const statusConfig = getStatusConfig(status);
  const wifiSignal = getWiFiSignal(latestReading?.wifi_rssi);

  return (
    <div
      onClick={handleClick}
      className="glass rounded-md p-4 cursor-pointer transition-all duration-300 hover:border-border-hover glow-teal flex flex-col justify-between group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-1 text-sm leading-tight truncate group-hover:text-teal-accent transition-colors">
            {meter.name}
          </h3>
          <p className="text-[11px] text-text-3 mt-0.5 truncate">{meter.location}</p>
          <p className="text-[9px] text-text-3/60 font-mono mt-1 uppercase tracking-wider">{meter.meter_id}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border ${statusConfig.bg} shrink-0 ml-2`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${statusConfig.text}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Electrical Parameters */}
      {latestReading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {/* Voltage */}
            <div className="bg-surface-2 rounded-sm p-2.5">
              <p className="text-text-3 text-[9px] uppercase tracking-wider font-medium">Voltage L-L Avg</p>
              <p className="font-mono font-bold text-text-1 text-base mt-0.5 tabular-nums">
                {latestReading.voltage_ll_avg.toFixed(1)}<span className="text-[10px] text-text-3 font-normal ml-0.5">V</span>
              </p>
            </div>
            
            {/* Current */}
            <div className="bg-surface-2 rounded-sm p-2.5">
              <p className="text-text-3 text-[9px] uppercase tracking-wider font-medium">Current Avg</p>
              <p className="font-mono font-bold text-text-1 text-base mt-0.5 tabular-nums">
                {latestReading.current_avg.toFixed(1)}<span className="text-[10px] text-text-3 font-normal ml-0.5">A</span>
              </p>
            </div>
            
            {/* Active Power — Accent */}
            <div className="bg-teal-accent/5 border border-teal-accent/10 rounded-sm p-2.5">
              <p className="text-teal-accent/70 text-[9px] uppercase tracking-wider font-medium">Active Power</p>
              <p className="font-mono font-bold text-teal-accent text-base mt-0.5 tabular-nums">
                {latestReading.active_power.toFixed(1)}<span className="text-[10px] opacity-60 font-normal ml-0.5">kW</span>
              </p>
            </div>
            
            {/* Power Factor */}
            <div className="bg-surface-2 rounded-sm p-2.5">
              <p className="text-text-3 text-[9px] uppercase tracking-wider font-medium">Power Factor</p>
              <p className="font-mono font-bold text-text-1 text-base mt-0.5 tabular-nums">
                {latestReading.power_factor.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Device Monitoring Row */}
          <div className="pt-2.5 border-t border-border">
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="flex items-center gap-1.5">
                <Cpu size={13} className="text-text-3/60" />
                <div>
                  <p className="text-text-3/60 text-[8px] uppercase tracking-wider">FW</p>
                  <p className="font-mono text-text-3 font-medium leading-none mt-0.5">
                    {latestReading.firmware_version || '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-text-3/60" />
                <div>
                  <p className="text-text-3/60 text-[8px] uppercase tracking-wider">Uptime</p>
                  <p className="font-mono text-text-3 font-medium leading-none mt-0.5">
                    {latestReading.uptime_seconds ? formatUptime(latestReading.uptime_seconds) : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <wifiSignal.Icon size={13} className={wifiSignal.color + '/60'} />
                <div>
                  <p className="text-text-3/60 text-[8px] uppercase tracking-wider">Signal</p>
                  <p className={`font-mono font-medium leading-none mt-0.5 ${wifiSignal.color}/80`}>
                    {latestReading.wifi_rssi ? `${latestReading.wifi_rssi} dB` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-text-3 font-mono text-[10px] uppercase font-medium py-6 bg-surface-2 rounded-sm tracking-wider">
          No telemetry stream
        </div>
      )}

      {/* Footer Timestamp */}
      {latestReading && (
        <div className="mt-3 pt-2.5 border-t border-border text-[9px] font-mono text-text-3/60 flex items-center justify-between">
          <span className="uppercase tracking-wider">Last Beat</span>
          <span className="text-text-3 tabular-nums">{formatTimestamp(latestReading.timestamp)}</span>
        </div>
      )}
    </div>
  );
}
