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
    return isHealthy ? 'text-green-500' : 'text-red-500';
  };

  const getStatusBgColor = (isHealthy: boolean) => {
    return isHealthy ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? <CheckCircle size={20} /> : <AlertCircle size={20} />;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white border-2 border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Activity className="text-gray-400" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        </div>
        <div className="text-gray-500 text-sm">Loading system status...</div>
      </div>
    );
  }

  // Error state (backend unreachable)
  if (error) {
    return (
      <div className={`bg-white border-2 border-red-500 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Activity className="text-red-500" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
          <span className="ml-auto flex items-center gap-2 text-red-500">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-sm font-medium">Unreachable</span>
          </span>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-500" size={20} />
              <div>
                <p className="font-medium text-gray-900 text-sm">Data Collector Service</p>
                <p className="text-xs text-gray-600">Backend API</p>
              </div>
            </div>
            <span className="text-red-600 font-semibold text-sm">OFFLINE</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded">
            <div className="flex items-center gap-3">
              <Database className="text-gray-400" size={20} />
              <div>
                <p className="font-medium text-gray-900 text-sm">Database Connection</p>
                <p className="text-xs text-gray-600">Unable to check</p>
              </div>
            </div>
            <span className="text-gray-500 font-semibold text-sm">UNKNOWN</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
          <p className="text-red-600 font-medium">⚠ Backend service is unreachable</p>
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
    <div className={`bg-white border-2 ${isSystemHealthy ? 'border-green-500' : 'border-red-500'} rounded-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Activity className={getStatusColor(isSystemHealthy)} size={24} />
        <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        <span className={`ml-auto flex items-center gap-2 ${getStatusColor(isSystemHealthy)}`}>
          <span className={`w-2 h-2 rounded-full ${getStatusBgColor(isSystemHealthy)} ${isSystemHealthy ? '' : 'animate-pulse'}`}></span>
          <span className="text-sm font-medium uppercase">{health?.status || 'unknown'}</span>
        </span>
      </div>

      <div className="space-y-4">
        {/* Backend Service Status */}
        <div className={`flex items-center justify-between p-3 ${isSystemHealthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded`}>
          <div className="flex items-center gap-3">
            {getStatusIcon(isSystemHealthy)}
            <div>
              <p className="font-medium text-gray-900 text-sm">Data Collector Service</p>
              <p className="text-xs text-gray-600">Version {health?.version || 'unknown'}</p>
              {health?.python_version && (
                <p className="text-xs text-gray-500">Python {health.python_version}</p>
              )}
            </div>
          </div>
          <span className={`${isSystemHealthy ? 'text-green-600' : 'text-red-600'} font-semibold text-sm`}>
            {isSystemHealthy ? 'ONLINE' : 'DEGRADED'}
          </span>
        </div>

        {/* Database Connection Status */}
        <div className={`flex items-center justify-between p-3 ${isDatabaseConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded`}>
          <div className="flex items-center gap-3">
            {getStatusIcon(isDatabaseConnected)}
            <div>
              <p className="font-medium text-gray-900 text-sm">Database Connection</p>
              <p className="text-xs text-gray-600">{health?.database?.message || 'Unknown'}</p>
            </div>
          </div>
          <span className={`${isDatabaseConnected ? 'text-green-600' : 'text-red-600'} font-semibold text-sm`}>
            {isDatabaseConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Footer - Last Check Timestamp */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>Last health check:</span>
          <span className="font-mono">{health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}</span>
        </div>
        {!isSystemHealthy && (
          <p className="mt-2 text-red-600 font-medium">⚠ System requires attention</p>
        )}
      </div>
    </div>
  );
}
