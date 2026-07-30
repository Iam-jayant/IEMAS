'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Save, AlertTriangle, CheckCircle, Settings as SettingsIcon, Info } from 'lucide-react';

interface Meter {
  meter_id: string;
  name: string;
  location: string;
}

interface Threshold {
  meter_id: string;
  high_power_threshold: number;
  low_power_factor_threshold: number;
  updated_at?: string;
}

interface MeterThresholdConfig {
  meter: Meter;
  threshold: Threshold;
  isEditing: boolean;
  isSaving: boolean;
  error: string;
  success: string;
}

export default function SettingsPage() {
  const [meterConfigs, setMeterConfigs] = useState<MeterThresholdConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Load all meters
      const meters: Meter[] = await api.get('/api/meters');

      // Load thresholds for each meter
      const configs: MeterThresholdConfig[] = await Promise.all(
        meters.map(async (meter) => {
          try {
            const threshold = await api.get(`/api/thresholds/${meter.meter_id}`);
            return {
              meter,
              threshold,
              isEditing: false,
              isSaving: false,
              error: '',
              success: '',
            };
          } catch (err) {
            // If threshold doesn't exist, use defaults
            return {
              meter,
              threshold: {
                meter_id: meter.meter_id,
                high_power_threshold: 10000,
                low_power_factor_threshold: 0.8,
              },
              isEditing: false,
              isSaving: false,
              error: '',
              success: '',
            };
          }
        })
      );

      setMeterConfigs(configs);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleThresholdChange = (
    meterId: string,
    field: 'high_power_threshold' | 'low_power_factor_threshold',
    value: string
  ) => {
    setMeterConfigs((prev) =>
      prev.map((config) =>
        config.meter.meter_id === meterId
          ? {
              ...config,
              threshold: {
                ...config.threshold,
                [field]: parseFloat(value) || 0,
              },
              isEditing: true,
              error: '',
              success: '',
            }
          : config
      )
    );
  };

  const validateThreshold = (config: MeterThresholdConfig): string | null => {
    if (config.threshold.high_power_threshold <= 0) {
      return 'High power threshold must be greater than 0';
    }
    if (
      config.threshold.low_power_factor_threshold < 0 ||
      config.threshold.low_power_factor_threshold > 1
    ) {
      return 'Low power factor threshold must be between 0.0 and 1.0';
    }
    return null;
  };

  const handleSave = async (meterId: string) => {
    const config = meterConfigs.find((c) => c.meter.meter_id === meterId);
    if (!config) return;

    // Validate
    const validationError = validateThreshold(config);
    if (validationError) {
      setMeterConfigs((prev) =>
        prev.map((c) =>
          c.meter.meter_id === meterId ? { ...c, error: validationError } : c
        )
      );
      return;
    }

    // Mark as saving
    setMeterConfigs((prev) =>
      prev.map((c) =>
        c.meter.meter_id === meterId
          ? { ...c, isSaving: true, error: '', success: '' }
          : c
      )
    );

    try {
      // Update threshold
      await api.put(`/api/thresholds/${meterId}`, {
        high_power_threshold: config.threshold.high_power_threshold,
        low_power_factor_threshold: config.threshold.low_power_factor_threshold,
      });

      // Mark as success
      setMeterConfigs((prev) =>
        prev.map((c) =>
          c.meter.meter_id === meterId
            ? {
                ...c,
                isSaving: false,
                isEditing: false,
                success: 'Thresholds updated successfully',
              }
            : c
        )
      );

      // Clear success message after 3 seconds
      setTimeout(() => {
        setMeterConfigs((prev) =>
          prev.map((c) =>
            c.meter.meter_id === meterId ? { ...c, success: '' } : c
          )
        );
      }, 3000);
    } catch (err: any) {
      setMeterConfigs((prev) =>
        prev.map((c) =>
          c.meter.meter_id === meterId
            ? {
                ...c,
                isSaving: false,
                error: err.message || 'Failed to update thresholds',
              }
            : c
        )
      );
    }
  };

  const handleReset = (meterId: string) => {
    loadSettings();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure alert thresholds for each meter
        </p>
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">About Threshold Configuration</p>
            <ul className="space-y-1 text-blue-800">
              <li>
                <strong>High Power Threshold:</strong> Alert triggers when active power
                exceeds this value (in kW)
              </li>
              <li>
                <strong>Low Power Factor Threshold:</strong> Alert triggers when power
                factor falls below this value (0.0 to 1.0)
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Meters Configuration */}
      {meterConfigs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <SettingsIcon size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No meters registered
          </h3>
          <p className="text-gray-600">
            Register meters to configure their threshold settings
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {meterConfigs.map((config) => (
            <div
              key={config.meter.meter_id}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              {/* Meter Info */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {config.meter.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {config.meter.location} • ID: {config.meter.meter_id}
                </p>
              </div>

              {/* Threshold Configuration Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* High Power Threshold */}
                <div>
                  <label
                    htmlFor={`high-power-${config.meter.meter_id}`}
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    High Power Threshold (kW)
                  </label>
                  <input
                    id={`high-power-${config.meter.meter_id}`}
                    type="number"
                    step="0.1"
                    min="0"
                    value={config.threshold.high_power_threshold}
                    onChange={(e) =>
                      handleThresholdChange(
                        config.meter.meter_id,
                        'high_power_threshold',
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019CDF] focus:border-transparent"
                    placeholder="e.g., 10000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Alert when power exceeds this value
                  </p>
                </div>

                {/* Low Power Factor Threshold */}
                <div>
                  <label
                    htmlFor={`low-pf-${config.meter.meter_id}`}
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Low Power Factor Threshold
                  </label>
                  <input
                    id={`low-pf-${config.meter.meter_id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={config.threshold.low_power_factor_threshold}
                    onChange={(e) =>
                      handleThresholdChange(
                        config.meter.meter_id,
                        'low_power_factor_threshold',
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#019CDF] focus:border-transparent"
                    placeholder="e.g., 0.8"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Alert when power factor falls below this value (0.0 - 1.0)
                  </p>
                </div>
              </div>

              {/* Actions and Feedback */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex-1">
                  {/* Error Message */}
                  {config.error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertTriangle size={16} />
                      <span>{config.error}</span>
                    </div>
                  )}

                  {/* Success Message */}
                  {config.success && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle size={16} />
                      <span>{config.success}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  {config.isEditing && (
                    <button
                      onClick={() => handleReset(config.meter.meter_id)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                      disabled={config.isSaving}
                    >
                      Reset
                    </button>
                  )}

                  <button
                    onClick={() => handleSave(config.meter.meter_id)}
                    disabled={!config.isEditing || config.isSaving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      config.isEditing && !config.isSaving
                        ? 'bg-[#019CDF] hover:bg-[#0284C7] text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Save size={18} />
                    {config.isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Last Updated */}
              {config.threshold.updated_at && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Last updated:{' '}
                    {new Date(config.threshold.updated_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
