'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, Database, Server, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * IEMAS - System Health Card Component
 * 
 * Displays Data_Collector service status and database connectivity from /api/health endpoint.
 * Shows system version, timestamp, and connection status with visual indicators.
 * Industrial SCADA-inspired design with status color coding.
 */

interface DatabaseStatus {
  connected: boolean;
  message: string;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  python_version?: string;
  database: DatabaseStatus;
}

interface SystemHealthCardProps {
  className?: string;
}

export default function SystemHealthCard({ className = '' }: SystemHealthCardProps) {
  // Fetch health status from backend
  const { data: health, isLoading, error } = useQuery<HealthStatus>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/health`);
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 3,
  });

  const getStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-teal-accent' : 'text-red-accent';
  };

  const getStatusBgColor = (isHealthy: boolean) => {
    return isHealthy ? 'bg-teal-accent' : 'bg-red-accent/100';
  };

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? <CheckCircle size={20} /> : <AlertCircle size={20} />;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`glass rounded-md p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Activity className="text-text-3" size={24} />
          <h3 className="text-lg font-semibold text-text-1">System Health</h3>
        </div>
        <div className="text-text-3 text-sm">Loading system status...</div>
      </div>
    );
  }

  // Error state (backend unreachable)
  if (error) {
    return (
      <div className={`glass border border-red-accent/40 rounded-md p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Activity className="text-red-accent" size={24} />
          <h3 className="text-lg font-semibold text-text-1">System Health</h3>
          <span className="ml-auto flex items-center gap-2 text-red-accent">
            <span className="w-2 h-2 rounded-full bg-red-accent/100 animate-pulse"></span>
            <span className="text-sm font-medium">Unreachable</span>
          </span>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-red-accent/10 border border-red-accent/20 rounded">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-accent" size={20} />
              <div>
                <p className="font-medium text-text-1 text-sm">Data Collector Service</p>
                <p className="text-xs text-text-2">Backend API</p>
              </div>
            </div>
            <span className="text-red-accent font-semibold text-sm">OFFLINE</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-2 border border-border rounded">
            <div className="flex items-center gap-3">
              <Database className="text-text-3" size={20} />
              <div>
                <p className="font-medium text-text-1 text-sm">Database Connection</p>
                <p className="text-xs text-text-2">Unable to check</p>
              </div>
            </div>
            <span className="text-text-3 font-semibold text-sm">UNKNOWN</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border text-xs text-text-3">
          <p className="text-red-accent font-medium">⚠ Backend service is unreachable</p>
          <p className="mt-1">Check if the backend is running and accessible</p>
        </div>
      </div>
    );
  }

  // Success state with health data
  if (!health) {
    return null; // Should not happen but TypeScript needs this
  }

  const isSystemHealthy = health.status === 'healthy';
  const isDatabaseConnected = health.database.connected;

  return (
    <div className={`glass border ${isSystemHealthy ? 'border-teal-accent' : 'border-red-accent/40'} rounded-md p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Activity className={getStatusColor(isSystemHealthy)} size={24} />
        <h3 className="text-lg font-semibold text-text-1">System Health</h3>
        <span className={`ml-auto flex items-center gap-2 ${getStatusColor(isSystemHealthy)}`}>
          <span className={`w-2 h-2 rounded-full ${getStatusBgColor(isSystemHealthy)} ${isSystemHealthy ? '' : 'animate-pulse'}`}></span>
          <span className="text-sm font-medium uppercase">{health?.status || 'unknown'}</span>
        </span>
      </div>

      <div className="space-y-4">
        {/* Backend Service Status */}
        <div className={`flex items-center justify-between p-3 ${isSystemHealthy ? 'bg-teal-accent/10 border-teal-accent/20' : 'bg-red-accent/10 border-red-accent/20'} border rounded`}>
          <div className="flex items-center gap-3">
            {getStatusIcon(isSystemHealthy)}
            <div>
              <p className="font-medium text-text-1 text-sm">Data Collector Service</p>
              <p className="text-xs text-text-2">Version {health?.version || 'unknown'}</p>
              {health?.python_version && (
                <p className="text-xs text-text-3">Python {health.python_version}</p>
              )}
            </div>
          </div>
          <span className={`${isSystemHealthy ? 'text-teal-accent' : 'text-red-accent'} font-semibold text-sm`}>
            {isSystemHealthy ? 'ONLINE' : 'DEGRADED'}
          </span>
        </div>

        {/* Database Connection Status */}
        <div className={`flex items-center justify-between p-3 ${isDatabaseConnected ? 'bg-teal-accent/10 border-teal-accent/20' : 'bg-red-accent/10 border-red-accent/20'} border rounded`}>
          <div className="flex items-center gap-3">
            {getStatusIcon(isDatabaseConnected)}
            <div>
              <p className="font-medium text-text-1 text-sm">Database Connection</p>
              <p className="text-xs text-text-2">{health?.database?.message || 'Unknown'}</p>
            </div>
          </div>
          <span className={`${isDatabaseConnected ? 'text-teal-accent' : 'text-red-accent'} font-semibold text-sm`}>
            {isDatabaseConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Footer - Last Check Timestamp */}
      <div className="mt-4 pt-4 border-t border-border text-xs text-text-3">
        <div className="flex items-center justify-between">
          <span>Last health check:</span>
          <span className="font-mono">{health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}</span>
        </div>
        {!isSystemHealthy && (
          <p className="mt-2 text-red-accent font-medium">⚠ System requires attention</p>
        )}
      </div>
    </div>
  );
}
