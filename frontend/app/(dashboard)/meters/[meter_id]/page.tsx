'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Activity, AlertTriangle, Power, Zap, Gauge } from 'lucide-react';
import { api } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DeviceMonitoring from '@/components/DeviceMonitoring';

interface Meter {
  meter_id: string;
  name: string;
  location: string;
  modbus_config: any;
  created_at: string;
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
  firmware_version?: string;
  uptime_seconds?: number;
  wifi_rssi?: number;
}

export default function MeterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const meter_id = params.meter_id as string;

  const [meter, setMeter] = useState<Meter | null>(null);
  const [latestReading, setLatestReading] = useState<MeterReading | null>(null);
  const [historicalData, setHistoricalData] = useState<MeterReading[]>([]);
  const [status, setStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('1h');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (meter_id) {
      loadMeterData();
      const interval = setInterval(loadMeterData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [meter_id, timeRange]);

  const loadMeterData = async () => {
    try {
      setIsLoading(true);
      setError('');

      const meterData = await api.get(`/api/meters/${meter_id}`);
      setMeter(meterData);

      const latestReadings = await api.get('/api/readings/latest');
      const latest = latestReadings.find((r: MeterReading) => r.meter_id === meter_id);
      setLatestReading(latest || null);

      if (latest) {
        const readingTime = new Date(latest.timestamp).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        setStatus(now - readingTime < fiveMinutes ? 'online' : 'offline');
      } else {
        setStatus('unknown');
      }

      const now = new Date();
      let startTime = new Date();
      
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }

      const readings = await api.get(
        `/api/readings?meter_id=${meter_id}&start_time=${startTime.toISOString()}&limit=1000`
      );
      
      const sortedReadings = readings.sort(
        (a: MeterReading, b: MeterReading) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      

      // Downsample data if too dense (max 500 points for charts)
      let displayReadings = sortedReadings;
      const MAX_POINTS = 500;
      if (displayReadings.length > MAX_POINTS) {
        const step = Math.ceil(displayReadings.length / MAX_POINTS);
        displayReadings = displayReadings.filter((_: any, i: number) => i % step === 0);
      }
      
      setHistoricalData(displayReadings);

    } catch (err: any) {
      setError(err.message || 'Failed to load meter data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'online':
        return 'bg-teal-accent shadow-[0_0_8px_rgba(13,148,136,0.4)]';
      case 'offline':
        return 'bg-red-accent shadow-[0_0_8px_rgba(225,29,72,0.4)]';
      default:
        return 'bg-text-3';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (isLoading && !meter) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 glass rounded-md p-8 max-w-7xl mx-auto">
        <Activity className="animate-spin text-teal-accent" size={32} />
        <div className="text-text-3 font-mono text-[11px] uppercase tracking-widest font-bold">Retrieving Node Details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/meters')}
          className="flex items-center gap-2 text-text-2 hover:text-text-1 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Meters
        </button>
        <div className="glass rounded-md p-5 text-center border-red-accent/20">
          <div className="flex flex-col items-center gap-2 text-red-accent">
            <AlertTriangle size={32} />
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider">Telemetry Link Failure</h3>
            <p className="text-xs text-text-3 font-sans">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!meter) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/meters')}
          className="flex items-center gap-2 text-text-2 hover:text-text-1 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Meters
        </button>
        <div className="text-center text-text-3 font-mono text-[11px] uppercase font-bold py-12 glass rounded-md">
          Node not found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/meters')}
            className="w-10 h-10 rounded-sm glass flex items-center justify-center text-text-2 hover:text-text-1 hover:border-teal-accent/40 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold font-display text-text-1">{meter.name}</h1>
            <p className="text-xs text-text-2 mt-0.5">{meter.location}</p>
            <p className="text-[10px] text-text-3 font-mono font-bold mt-1 uppercase tracking-wider">{meter.meter_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3.5 py-1.5 glass rounded-sm select-none">
          <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(status)}`}></span>
          <span className="text-[10px] font-mono text-text-2 uppercase font-bold tracking-wider">{status}</span>
        </div>
      </div>

      {/* Current Status Cards */}
      {latestReading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="glass rounded-md p-5 glow-teal group transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <p className="text-text-3 text-[10px] font-bold uppercase tracking-wider font-mono">Voltage</p>
              <Zap className="text-amber-accent" size={18} />
            </div>
            <p className="text-2xl font-bold text-text-1 font-mono tabular-nums">{latestReading.voltage.toFixed(1)}</p>
            <p className="text-text-3 text-[10px] font-mono font-bold mt-1">VOLTS (V)</p>
          </div>

          <div className="glass rounded-md p-5 glow-teal group transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <p className="text-text-3 text-[10px] font-bold uppercase tracking-wider font-mono">Current</p>
              <Activity className="text-teal-accent" size={18} />
            </div>
            <p className="text-2xl font-bold text-text-1 font-mono tabular-nums">{latestReading.current.toFixed(1)}</p>
            <p className="text-text-3 text-[10px] font-mono font-bold mt-1">AMPERES (A)</p>
          </div>

          <div className="glass rounded-md p-5 border-teal-accent/20 glow-teal group transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <p className="text-teal-accent text-[10px] font-bold uppercase tracking-wider font-mono">Active Power</p>
              <Power className="text-teal-accent" size={18} />
            </div>
            <p className="text-2xl font-bold text-teal-accent font-mono tabular-nums">{latestReading.active_power.toFixed(1)}</p>
            <p className="text-teal-accent/70 text-[10px] font-mono font-bold mt-1">KILOWATTS (kW)</p>
          </div>

          <div className="glass rounded-md p-5 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <p className="text-text-3 text-[10px] font-bold uppercase tracking-wider font-mono">Power Factor</p>
              <Gauge className="text-violet-accent" size={18} />
            </div>
            <p className="text-2xl font-bold text-text-1 font-mono tabular-nums">{latestReading.power_factor.toFixed(2)}</p>
            <p className="text-text-3 text-[10px] font-mono font-bold mt-1">RATIO (PF)</p>
          </div>

        </div>
      ) : (
        <div className="glass rounded-md p-5 text-center border-amber-accent/20">
          <p className="text-xs text-amber-accent font-mono uppercase font-bold tracking-wider">No active readings telemetry stream</p>
        </div>
      )}

      {/* Detailed Parameters Grid */}
      {latestReading && (
        <div className="glass rounded-md p-6">
          <h2 className="text-sm font-bold font-display text-text-1 uppercase tracking-wider mb-5">Telemetry Vector Registers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-2 rounded-md p-3.5 border border-border">
              <p className="text-text-3 text-[9px] uppercase tracking-wider font-bold font-mono">Reactive Power</p>
              <p className="text-sm font-bold font-mono text-text-1 mt-1">{latestReading.reactive_power.toFixed(1)} kVAR</p>
            </div>
            <div className="bg-surface-2 rounded-md p-3.5 border border-border">
              <p className="text-text-3 text-[9px] uppercase tracking-wider font-bold font-mono">Apparent Power</p>
              <p className="text-sm font-bold font-mono text-text-1 mt-1">{latestReading.apparent_power.toFixed(1)} kVA</p>
            </div>
            <div className="bg-surface-2 rounded-md p-3.5 border border-border">
              <p className="text-text-3 text-[9px] uppercase tracking-wider font-bold font-mono">Frequency</p>
              <p className="text-sm font-bold font-mono text-text-1 mt-1">{latestReading.frequency.toFixed(2)} Hz</p>
            </div>
            <div className="bg-surface-2 rounded-md p-3.5 border border-border">
              <p className="text-text-3 text-[9px] uppercase tracking-wider font-bold font-mono">Total Net Accumulator</p>
              <p className="text-sm font-bold font-mono text-text-1 mt-1">{latestReading.cumulative_energy.toFixed(2)} kWh</p>
            </div>
          </div>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono uppercase font-bold text-text-3 tracking-wider">Time Range:</span>
        <div className="flex gap-1.5 glass rounded-md p-1 shadow-sm">
          {(['1h', '24h', '7d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-sm text-xs font-mono font-bold transition-all uppercase tracking-wider cursor-pointer ${
                timeRange === range
                  ? 'bg-teal-accent text-bg shadow-sm'
                  : 'text-text-2 hover:text-text-1 hover:bg-surface-2/60'
              }`}
            >
              {range === '1h' ? '1 Hour' : range === '24h' ? '24 Hours' : '7 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Historical Charts */}
      {historicalData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Power Chart */}
          <div className="glass rounded-md p-5">
            <h3 className="text-xs font-bold font-display text-text-1 uppercase tracking-wider mb-4">Active Power Log (kW)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={historicalData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                  stroke="var(--text-3)"
                  style={{ fontSize: '9px', fontFamily: 'var(--font-jetbrains-mono)' }}
                />
                <YAxis stroke="var(--text-3)" style={{ fontSize: '9px', fontFamily: 'var(--font-jetbrains-mono)' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border)', fontSize: '10px' }}
                  labelFormatter={(ts: any) => formatTimestamp(ts as string)}
                />
                <Line type="monotone" dataKey="active_power" stroke="var(--teal)" strokeWidth={2} dot={false} name="Power (kW)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Power Factor Chart */}
          <div className="glass rounded-md p-5">
            <h3 className="text-xs font-bold font-display text-text-1 uppercase tracking-wider mb-4">Power Factor Register Log</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={historicalData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                  stroke="var(--text-3)"
                  style={{ fontSize: '9px', fontFamily: 'var(--font-jetbrains-mono)' }}
                />
                <YAxis stroke="var(--text-3)" style={{ fontSize: '9px', fontFamily: 'var(--font-jetbrains-mono)' }} domain={[0.6, 1.0]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border)', fontSize: '10px' }}
                  labelFormatter={(ts: any) => formatTimestamp(ts as string)}
                />
                <Line type="monotone" dataKey="power_factor" stroke="var(--violet)" strokeWidth={2} dot={false} name="Power Factor" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Voltage Chart */}
          <div className="glass rounded-md p-5">
            <h3 className="text-xs font-bold font-display text-text-1 uppercase tracking-wider mb-4">Line Voltage Registry (V)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={historicalData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                  stroke="var(--text-3)"
                  style={{ fontSize: '9px', fontFamily: 'var(--font-jetbrains-mono)' }}
                />
                <YAxis stroke="var(--text-3)" style={{ fontSize: '9px', fontFamily: 'var(--font-jetbrains-mono)' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border)', fontSize: '10px' }}
                  labelFormatter={(ts: any) => formatTimestamp(ts as string)}
                />
                <Line type="monotone" dataKey="voltage" stroke="var(--amber)" strokeWidth={2} dot={false} name="Voltage (V)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Current Chart */}
          <div className="glass rounded-md p-5">
            <h3 className="text-xs font-bold font-display text-text-1 uppercase tracking-wider mb-4">Phase Current Vectors (A)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={historicalData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                  stroke="var(--text-3)"
                  style={{ fontSize: '9px', fontFamily: 'var(--font-jetbrains-mono)' }}
                />
                <YAxis stroke="var(--text-3)" style={{ fontSize: '9px', fontFamily: 'var(--font-jetbrains-mono)' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border)', fontSize: '10px' }}
                  labelFormatter={(ts: any) => formatTimestamp(ts as string)}
                />
                <Line type="monotone" dataKey="current" stroke="#3B82F6" strokeWidth={2} dot={false} name="Current (A)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      ) : (
        <div className="glass rounded-md p-12 text-center">
          <p className="text-xs text-text-3 font-mono font-bold uppercase tracking-wider">No registry logs available for chosen range</p>
        </div>
      )}

      {/* ESP32 Device Monitoring */}
      <DeviceMonitoring meterId={meter_id} />

      {/* Meter Configuration and Firmware Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="glass rounded-md p-6">
          <h3 className="text-xs font-bold font-display text-text-1 uppercase tracking-wider mb-4">Modbus Configuration</h3>
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between border-b border-border pb-2 font-mono">
              <span className="text-text-3">SLAVE NODE ID</span>
              <span className="font-bold text-text-1">{meter.meter_id}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-text-2">Physical Location</span>
              <span className="font-bold text-text-1">{meter.location}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-text-2">Registry Connection</span>
              <span className="font-bold text-text-1">{formatTimestamp(meter.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="glass rounded-md p-6">
          <h3 className="text-xs font-bold font-display text-text-1 uppercase tracking-wider mb-4">Microcontroller Diagnostics</h3>
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between border-b border-border pb-2 font-mono">
              <span className="text-text-3">GATEWAY FW VERSION</span>
              <span className="font-bold text-text-1">{latestReading?.firmware_version || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-text-2">Uptime Duration</span>
              <span className="font-bold font-mono text-text-1">{formatUptime(latestReading?.uptime_seconds)}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-text-2">Last Dispatch Beat</span>
              <span className="font-bold font-mono text-text-1">
                {latestReading ? formatTimestamp(latestReading.timestamp) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
