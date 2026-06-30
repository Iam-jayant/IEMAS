/**
 * IEMAS Frontend - Landing Page
 */
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-6xl font-bold text-center mb-8 text-gray-900">
          IEMAS
        </h1>
        <p className="text-2xl text-center mb-4 text-gray-700">
          Industrial Energy Monitoring & Analytics System
        </p>
        <p className="text-lg text-center mb-12 text-gray-600">
          Real-time monitoring, intelligent analytics, and AI-powered insights for industrial energy consumption
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-[#019CDF] hover:bg-[#0180b8] text-white rounded-lg font-semibold transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-3 border-2 border-gray-300 hover:border-[#019CDF] text-gray-700 hover:text-[#019CDF] rounded-lg font-semibold transition-colors"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">24/7 Monitoring</h3>
            <p className="text-gray-600">Real-time data collection from Schneider Energy Meters every 1-2 minutes</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">AI-Powered Insights</h3>
            <p className="text-gray-600">Ask questions about your energy data in natural language</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Smart Alerts</h3>
            <p className="text-gray-600">Threshold-based notifications for power consumption and power factor</p>
          </div>
        </div>
      </div>
    </main>
  )
}
