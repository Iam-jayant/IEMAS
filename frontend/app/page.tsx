/**
 * IEMAS Frontend - Landing Page
 * Industrial SCADA-inspired design
 */
import Link from 'next/link'
import { Gauge, Zap, Bell, TrendingUp, Shield, Activity } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32 lg:px-8">
          {/* Logo and Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <Activity className="w-12 h-12 text-[#019CDF]" />
              <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                IEMAS
              </h1>
            </div>
            <p className="text-2xl font-semibold text-gray-300 mb-4">
              Industrial Energy Monitoring & Analytics System
            </p>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Enterprise-grade IoT platform for real-time monitoring of Schneider Energy Meters with AI-powered analytics
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center mb-20">
            <Link
              href="/login"
              className="group px-8 py-4 bg-[#019CDF] hover:bg-[#0180b8] text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#019CDF]/20 hover:shadow-[#019CDF]/40 flex items-center gap-2"
            >
              Get Started
              <TrendingUp className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/meters"
              className="px-8 py-4 border-2 border-gray-600 hover:border-[#019CDF] bg-gray-800/50 hover:bg-gray-800 text-gray-200 rounded-lg font-semibold transition-all backdrop-blur-sm"
            >
              View Dashboard
            </Link>
          </div>

          {/* Key Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-[#019CDF] rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-[#019CDF]/10">
              <div className="absolute inset-0 bg-gradient-to-br from-[#019CDF]/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 bg-[#019CDF]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#019CDF]/20 transition-colors">
                  <Gauge className="w-6 h-6 text-[#019CDF]" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Real-Time Monitoring</h3>
                <p className="text-gray-400 leading-relaxed">
                  Automatic data collection from Schneider meters every 60-120 seconds via Modbus RTU
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-[#019CDF] rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-[#019CDF]/10">
              <div className="absolute inset-0 bg-gradient-to-br from-[#019CDF]/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 bg-[#019CDF]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#019CDF]/20 transition-colors">
                  <Zap className="w-6 h-6 text-[#019CDF]" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">AI-Powered Insights</h3>
                <p className="text-gray-400 leading-relaxed">
                  Natural language queries powered by Gemini AI for instant energy consumption analysis
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-[#019CDF] rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-[#019CDF]/10">
              <div className="absolute inset-0 bg-gradient-to-br from-[#019CDF]/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 bg-[#019CDF]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#019CDF]/20 transition-colors">
                  <Bell className="w-6 h-6 text-[#019CDF]" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Smart Alerts</h3>
                <p className="text-gray-400 leading-relaxed">
                  Configurable threshold alerts for high power consumption and low power factor
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-[#019CDF] mb-2">
                &lt;500ms
              </div>
              <div className="text-sm text-gray-400 font-medium">Data Ingestion</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#019CDF] mb-2">
                &lt;10s
              </div>
              <div className="text-sm text-gray-400 font-medium">Alert Delivery</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#019CDF] mb-2">
                1-20
              </div>
              <div className="text-sm text-gray-400 font-medium">Meters Supported</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#019CDF] mb-2">
                24/7
              </div>
              <div className="text-sm text-gray-400 font-medium">Monitoring</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="max-w-7xl mx-auto px-6 py-16 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Enterprise-Grade Technology
          </h2>
          <p className="text-gray-400">
            Built with industry-leading tools and frameworks
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            { name: 'ESP32', desc: 'Edge Devices' },
            { name: 'FastAPI', desc: 'Backend' },
            { name: 'PostgreSQL', desc: 'Database' },
            { name: 'Next.js', desc: 'Frontend' },
            { name: 'Gemini AI', desc: 'Analytics' },
          ].map((tech) => (
            <div
              key={tech.name}
              className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center hover:border-gray-600 transition-colors"
            >
              <div className="text-lg font-semibold text-white mb-1">{tech.name}</div>
              <div className="text-sm text-gray-400">{tech.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="w-5 h-5 text-[#019CDF]" />
              <span className="text-sm">Enterprise-grade security with JWT authentication</span>
            </div>
            <div className="text-sm text-gray-500">
              © 2026 IEMAS. Industrial Energy Monitoring System.
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

