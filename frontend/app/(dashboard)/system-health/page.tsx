'use client';

import SystemHealthCard from '@/components/SystemHealthCard';
import MeterStatusList from '@/components/MeterStatusList';

/**
 * IEMAS - System Health Monitoring Page
 * 
 * Displays backend service health and meter connectivity status.
 * Implements requirements 10.1, 10.2, 10.3, and 10.4.
 */

export default function SystemHealthPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
        <p className="text-gray-600 mt-1">
          Monitor backend services, database connectivity, and meter status
        </p>
      </div>

      {/* Health Monitoring Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backend System Health */}
        <SystemHealthCard />

        {/* Meter Connection Status */}
        <MeterStatusList showDeviceInfo={true} />
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">About System Health Monitoring</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Backend Health:</strong> Real-time status of Data_Collector service and database connection</li>
          <li>• <strong>Meter Status:</strong> Connection status for all registered meters</li>
          <li>• <strong>Offline Detection:</strong> Meters marked offline after 5 minutes without data</li>
          <li>• <strong>Auto-refresh:</strong> System health refreshes every 10 seconds, meter status every 5 seconds</li>
        </ul>
      </div>
    </div>
  );
}
