'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  Download,
  Printer,
  Search,
  RotateCcw,
  Database,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileJson
} from 'lucide-react'

interface Reading {
  id: number
  meter_id: string
  timestamp: string
  voltage: number
  current: number
  active_power: number
  reactive_power: number
  apparent_power: number
  power_factor: number
  frequency: number
  cumulative_energy: number
  firmware_version?: string
  uptime_seconds?: number
  wifi_rssi?: number
  created_at: string
}

function fmtNum(n: number, decimals = 1) {
  return n.toFixed(decimals);
}

export default function HistoricalDataPage() {
  const [meterId, setMeterId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [limit, setLimit] = useState<number>(1000)
  const [shouldFetch, setShouldFetch] = useState(false)

  // Fetch readings with filters
  const { data: readings = [], isLoading, error } = useQuery<Reading[]>({
    queryKey: ['historical-readings', meterId, startDate, endDate, limit, shouldFetch],
    queryFn: async () => {
      if (!shouldFetch) return []
      
      const params = new URLSearchParams()
      if (meterId) params.append('meter_id', meterId)
      if (startDate) params.append('start_time', new Date(startDate).toISOString())
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        params.append('end_time', end.toISOString())
      }
      params.append('limit', limit.toString())

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/readings?${params}`)
      if (!response.ok) throw new Error('Failed to fetch readings')
      return response.json()
    },
    enabled: shouldFetch,
  })

  const handleSearch = () => {
    setShouldFetch(true)
  }

  const handleReset = () => {
    setMeterId('')
    setStartDate('')
    setEndDate('')
    setLimit(1000)
    setShouldFetch(false)
  }

  const handleExport = (format: 'csv' | 'json') => {
    const params = new URLSearchParams()
    if (meterId) params.append('meter_id', meterId)
    if (startDate) params.append('start_time', new Date(startDate).toISOString())
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      params.append('end_time', end.toISOString())
    }
    params.append('limit', limit.toString())

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/readings/export/${format}?${params}`
    window.open(url, '_blank')
  }

  const handlePrint = () => {
    window.print()
  }

  // Quick date range presets
  const setDateRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {/* ───────── Page Header ───────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-1">Historical Data</h1>
          <p className="text-text-3 text-sm mt-0.5">
            Query and export meter readings with date range filtering
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-text-3 font-mono">
          <Database size={12} /> {shouldFetch && readings.length > 0 ? `${readings.length} records loaded` : 'Ready to query'}
        </span>
      </div>

      {/* ───────── Filters Section ───────── */}
      <div className="bg-surface border border-border rounded-md p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-teal-accent" />
          <h2 className="text-sm font-display font-bold text-text-1">Filter Options</h2>
        </div>
        
        {/* Quick Date Ranges */}
        <div>
          <label className="block text-xs font-semibold text-text-3 uppercase tracking-wider mb-2.5">
            Quick Date Range
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Last 24 Hours', days: 1 },
              { label: 'Last 7 Days', days: 7 },
              { label: 'Last 30 Days', days: 30 },
              { label: 'Last 90 Days', days: 90 }
            ].map(({ label, days }) => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className="px-4 py-2.5 bg-surface-2 hover:bg-teal-accent/10 text-text-2 hover:text-teal-accent border border-border hover:border-teal-accent/50 rounded-md transition-all text-sm font-medium"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Meter ID */}
          <div>
            <label className="block text-xs font-semibold text-text-3 uppercase tracking-wider mb-2.5">
              Meter ID (Optional)
            </label>
            <input
              type="text"
              value={meterId}
              onChange={(e) => setMeterId(e.target.value)}
              placeholder="e.g., METER001"
              className="w-full px-4 py-2.5 bg-surface-2 border border-border rounded-md text-text-1 font-mono text-sm placeholder:text-text-3 focus:outline-none focus:border-teal-accent focus:ring-1 focus:ring-teal-accent/50 transition-all"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-text-3 uppercase tracking-wider mb-2.5">
              <Calendar size={12} className="inline mb-0.5 mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-2 border border-border rounded-md text-text-1 font-mono text-sm focus:outline-none focus:border-teal-accent focus:ring-1 focus:ring-teal-accent/50 transition-all"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-text-3 uppercase tracking-wider mb-2.5">
              <Calendar size={12} className="inline mb-0.5 mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-2 border border-border rounded-md text-text-1 font-mono text-sm focus:outline-none focus:border-teal-accent focus:ring-1 focus:ring-teal-accent/50 transition-all"
            />
          </div>

          {/* Limit */}
          <div>
            <label className="block text-xs font-semibold text-text-3 uppercase tracking-wider mb-2.5">
              Max Records
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-surface-2 border border-border rounded-md text-text-1 font-mono text-sm focus:outline-none focus:border-teal-accent focus:ring-1 focus:ring-teal-accent/50 transition-all"
            >
              <option value="100">100</option>
              <option value="500">500</option>
              <option value="1000">1,000</option>
              <option value="5000">5,000</option>
              <option value="10000">10,000</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-accent hover:bg-teal-accent/90 text-bg font-semibold rounded-md transition-all text-sm shadow-lg shadow-teal-accent/20"
          >
            <Search size={16} />
            Search
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-surface-2 hover:bg-red-accent/10 text-text-2 hover:text-red-accent border border-border hover:border-red-accent/50 rounded-md transition-all text-sm"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* ───────── Results Section ───────── */}
      {shouldFetch && (
        <div className="bg-surface border border-border rounded-md p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-sm font-display font-bold text-text-1">
                Search Results
              </h2>
              <p className="text-xs text-text-3 font-mono mt-0.5">
                {readings.length} record(s) found
              </p>
            </div>

            {/* Export/Print Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={readings.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/90 hover:bg-green-600 disabled:bg-surface-2 disabled:text-text-3 disabled:cursor-not-allowed text-white rounded-md transition-all text-sm font-medium shadow-lg shadow-green-600/20"
              >
                <FileSpreadsheet size={16} />
                Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={readings.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/90 hover:bg-blue-600 disabled:bg-surface-2 disabled:text-text-3 disabled:cursor-not-allowed text-white rounded-md transition-all text-sm font-medium shadow-lg shadow-blue-600/20"
              >
                <FileJson size={16} />
                Export JSON
              </button>
              <button
                onClick={handlePrint}
                disabled={readings.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600/90 hover:bg-violet-600 disabled:bg-surface-2 disabled:text-text-3 disabled:cursor-not-allowed text-white rounded-md transition-all text-sm font-medium shadow-lg shadow-violet-600/20"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Clock className="w-8 h-8 text-teal-accent animate-spin mb-3" />
              <p className="text-text-3 text-sm font-mono">Loading readings...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-accent/10 border border-red-accent/30 rounded-md p-4 text-red-accent">
              <p className="font-semibold text-sm">Failed to load readings</p>
              <p className="text-xs mt-1 opacity-80">Please check your filters and try again.</p>
            </div>
          )}

          {/* Data Table */}
          {!isLoading && !error && readings.length > 0 && (
            <div className="overflow-x-auto print-section">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 border-b-2 border-border">
                  <tr className="text-text-3 text-xs font-mono uppercase tracking-wider">
                    <th className="px-4 py-3.5 text-left font-bold">Timestamp</th>
                    <th className="px-4 py-3.5 text-left font-bold">Meter ID</th>
                    <th className="px-4 py-3.5 text-right font-bold">Voltage</th>
                    <th className="px-4 py-3.5 text-right font-bold">Current</th>
                    <th className="px-4 py-3.5 text-right font-bold">Power</th>
                    <th className="px-4 py-3.5 text-right font-bold">PF</th>
                    <th className="px-4 py-3.5 text-right font-bold">Freq</th>
                    <th className="px-4 py-3.5 text-right font-bold">Energy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {readings.map((reading) => (
                    <tr key={reading.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-text-2">
                        {new Date(reading.timestamp).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-teal-accent">
                        {reading.meter_id}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-text-2">
                        {fmtNum(reading.voltage, 1)} V
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-text-2">
                        {fmtNum(reading.current, 2)} A
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-text-1 font-semibold">
                        {fmtNum(reading.active_power, 2)} kW
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-text-2">
                        {fmtNum(reading.power_factor, 3)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-text-2">
                        {fmtNum(reading.frequency, 2)} Hz
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-text-2">
                        {fmtNum(reading.cumulative_energy, 1)} kWh
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* No Results */}
          {!isLoading && !error && readings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-text-3">
              <Database size={48} className="mb-3 opacity-50" />
              <p className="font-display font-bold text-text-2">No readings found</p>
              <p className="text-sm mt-1">Try adjusting your filters and search again.</p>
            </div>
          )}
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
