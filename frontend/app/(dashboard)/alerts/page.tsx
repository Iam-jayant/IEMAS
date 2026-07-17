'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Zap,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Filter,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';

// Alert types from backend
type AlertType = 'HIGH_POWER' | 'LOW_POWER_FACTOR';

interface Alert {
  id: number;
  meter_id: string;
  alert_type: AlertType;
  measured_value: number;
  threshold_value: number;
  timestamp: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  dismissed: boolean;
  dismissed_at: string | null;
  dismissed_by: string | null;
  created_at: string;
}

type SortField = 'timestamp' | 'meter_id' | 'alert_type' | 'measured_value';
type SortOrder = 'asc' | 'desc';

export default function AlertsPage() {
  // Filter states
  const [filterMeter, setFilterMeter] = useState<string>('');
  const [filterType, setFilterType] = useState<AlertType | ''>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'acknowledged' | 'dismissed'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Fetch alerts with filters
  const { data: alerts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['alerts', filterMeter, filterType, startDate, endDate, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filterMeter) params.append('meter_id', filterMeter);
      if (startDate) params.append('start_time', new Date(startDate).toISOString());
      if (endDate) params.append('end_time', new Date(endDate).toISOString());
      
      // Use active_only parameter for backend filtering
      if (filterStatus === 'active') {
        params.append('active_only', 'true');
      }
      
      const queryString = params.toString();
      const endpoint = `/api/alerts${queryString ? `?${queryString}` : ''}`;
      
      return api.get(endpoint);
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch list of meters for filter dropdown
  const { data: meters = [] } = useQuery({
    queryKey: ['meters'],
    queryFn: () => api.get('/api/meters'),
  });

  // Client-side filtering for acknowledged/dismissed (supplement to backend filtering)
  const filteredAlerts = alerts.filter((alert: Alert) => {
    if (filterStatus === 'acknowledged') return alert.acknowledged && !alert.dismissed;
    if (filterStatus === 'dismissed') return alert.dismissed;
    if (filterStatus === 'active') return !alert.dismissed && !alert.acknowledged;
    return true; // 'all'
  }).filter((alert: Alert) => {
    // Additional filter by alert type
    if (filterType && alert.alert_type !== filterType) return false;
    return true;
  });

  // Sort alerts
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    // Handle timestamp sorting
    if (sortField === 'timestamp') {
      aVal = new Date(a.timestamp).getTime();
      bVal = new Date(b.timestamp).getTime();
    }

    // Handle numeric sorting
    if (sortField === 'measured_value') {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }

    // Sort logic
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Alert actions
  const handleAcknowledge = async (alertId: number) => {
    try {
      await api.post(`/api/alerts/${alertId}/acknowledge`, {});
      refetch();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleDismiss = async (alertId: number) => {
    try {
      await api.post(`/api/alerts/${alertId}/dismiss`, {});
      refetch();
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  };

  // Get alert icon
  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'HIGH_POWER':
        return <Zap className="text-orange-500" size={20} />;
      case 'LOW_POWER_FACTOR':
        return <TrendingDown className="text-yellow-500" size={20} />;
      default:
        return <AlertTriangle className="text-red-500" size={20} />;
    }
  };

  // Format alert type for display
  const formatAlertType = (type: AlertType): string => {
    switch (type) {
      case 'HIGH_POWER':
        return 'High Power';
      case 'LOW_POWER_FACTOR':
        return 'Low Power Factor';
      default:
        return type;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading alerts...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle size={20} />
          <span>Failed to load alerts. Please try again.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert Management</h1>
          <p className="text-gray-600 mt-1">
            {sortedAlerts.length} alert{sortedAlerts.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded transition-colors"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
            </div>
            <AlertTriangle className="text-gray-400" size={24} />
          </div>
        </div>

        <div className="bg-white border-2 border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active</p>
              <p className="text-2xl font-bold text-orange-600">
                {alerts.filter((a: Alert) => !a.dismissed && !a.acknowledged).length}
              </p>
            </div>
            <AlertTriangle className="text-orange-500" size={24} />
          </div>
        </div>

        <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Acknowledged</p>
              <p className="text-2xl font-bold text-blue-600">
                {alerts.filter((a: Alert) => a.acknowledged && !a.dismissed).length}
              </p>
            </div>
            <Check className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Dismissed</p>
              <p className="text-2xl font-bold text-gray-600">
                {alerts.filter((a: Alert) => a.dismissed).length}
              </p>
            </div>
            <X className="text-gray-500" size={24} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Meter Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meter</label>
            <select
              value={filterMeter}
              onChange={(e) => setFilterMeter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#019CDF]"
            >
              <option value="">All Meters</option>
              {meters.map((meter: any) => (
                <option key={meter.meter_id} value={meter.meter_id}>
                  {meter.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alert Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as AlertType | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#019CDF]"
            >
              <option value="">All Types</option>
              <option value="HIGH_POWER">High Power</option>
              <option value="LOW_POWER_FACTOR">Low Power Factor</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#019CDF]"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#019CDF]"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#019CDF]"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(filterMeter || filterType || filterStatus !== 'all' || startDate || endDate) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setFilterMeter('');
                setFilterType('');
                setFilterStatus('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-sm text-[#019CDF] hover:text-[#0284C7] font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Alerts Table */}
      <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
        {sortedAlerts.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No alerts found</h3>
            <p className="text-gray-600">
              {filterMeter || filterType || filterStatus !== 'all' || startDate || endDate
                ? 'Try adjusting your filters'
                : 'No alerts have been generated yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('timestamp')}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Timestamp
                      {sortField === 'timestamp' &&
                        (sortOrder === 'asc' ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        ))}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('meter_id')}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Meter ID
                      {sortField === 'meter_id' &&
                        (sortOrder === 'asc' ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        ))}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('alert_type')}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Type
                      {sortField === 'alert_type' &&
                        (sortOrder === 'asc' ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        ))}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('measured_value')}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Measured Value
                      {sortField === 'measured_value' &&
                        (sortOrder === 'asc' ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        ))}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-gray-700">Threshold</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-gray-700">Status</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-gray-700">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedAlerts.map((alert: Alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatTimestamp(alert.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {alert.meter_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getAlertIcon(alert.alert_type)}
                        <span className="text-sm text-gray-900">
                          {formatAlertType(alert.alert_type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {alert.measured_value.toFixed(2)}
                      {alert.alert_type === 'HIGH_POWER' ? ' kW' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {alert.threshold_value.toFixed(2)}
                      {alert.alert_type === 'HIGH_POWER' ? ' kW' : ''}
                    </td>
                    <td className="px-4 py-3">
                      {alert.dismissed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                          <X size={14} />
                          Dismissed
                        </span>
                      ) : alert.acknowledged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          <Check size={14} />
                          Acknowledged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                          <AlertTriangle size={14} />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!alert.acknowledged && !alert.dismissed && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
                            title="Acknowledge alert"
                          >
                            Acknowledge
                          </button>
                        )}
                        {!alert.dismissed && (
                          <button
                            onClick={() => handleDismiss(alert.id)}
                            className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs font-medium rounded transition-colors"
                            title="Dismiss alert"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
