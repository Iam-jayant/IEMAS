'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { api } from '@/lib/api';

interface MeterFormData {
  meter_id: string;
  name: string;
  location: string;
  modbus_type: 'RTU' | 'TCP';
  baudrate: number;
  slave_id: number;
}

export default function RegisterMeterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<MeterFormData>({
    meter_id: '',
    name: '',
    location: '',
    modbus_type: 'RTU',
    baudrate: 9600,
    slave_id: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.meter_id.trim()) {
      newErrors.meter_id = 'Meter ID is required';
    } else if (!/^[A-Z0-9_-]+$/.test(formData.meter_id)) {
      newErrors.meter_id = 'Meter ID must contain only uppercase letters, numbers, hyphens, and underscores';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Meter name is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (formData.slave_id < 1 || formData.slave_id > 247) {
      newErrors.slave_id = 'Slave ID must be between 1 and 247';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof MeterFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    setSubmitError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      try {
        await api.get(`/api/meters/${formData.meter_id}`);
        setSubmitError(`Meter with ID "${formData.meter_id}" already exists. Please use a different ID.`);
        setIsSubmitting(false);
        return;
      } catch (err: any) {
        if (!err.message.includes('404') && !err.message.includes('not found')) {
          throw err;
        }
      }

      const modbus_config = {
        type: formData.modbus_type,
        baudrate: formData.baudrate,
        slave_id: formData.slave_id,
        registers: {
          voltage: 0,
          current: 6,
          active_power: 12,
          reactive_power: 18,
          apparent_power: 24,
          power_factor: 30,
          frequency: 36,
          energy: 42,
        },
      };

      await api.post('/api/meters', {
        meter_id: formData.meter_id,
        name: formData.name,
        location: formData.location,
        modbus_config: modbus_config,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        router.push('/meters');
      }, 2000);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to register meter. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface border border-border rounded-3xl p-8 text-center shadow-sm">
          <CheckCircle size={48} className="mx-auto text-teal-accent mb-4" />
          <h2 className="text-lg font-bold font-display text-text-1 mb-2">Registration Successful</h2>
          <p className="text-xs text-text-2 mb-4 leading-relaxed font-sans">
            Meter <span className="font-mono font-bold text-teal-accent">{formData.meter_id}</span> has been successfully mapped to Modbus loop indices.
          </p>
          <p className="text-[10px] text-text-3 font-mono font-bold animate-pulse uppercase tracking-wider">Redirecting to meters grid...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/meters')}
          className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-text-2 hover:text-text-1 hover:border-teal-accent/40 hover:bg-surface-2 transition-all cursor-pointer"
          disabled={isSubmitting}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-bold font-display text-text-1">REGISTER SLAVE NODE</h1>
          <p className="text-xs text-text-2 mt-0.5">Map a physical Schneider smart meter registers onto the system.</p>
        </div>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="bg-red-accent/5 border border-red-accent/20 rounded-3xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-accent flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold font-mono text-red-accent uppercase tracking-wider mb-1">Link Registration Blocked</h3>
              <p className="text-xs text-text-2 font-sans">{submitError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-3xl p-6 space-y-6 shadow-sm">
        
        {/* Identification */}
        <div>
          <h2 className="text-xs font-bold text-text-3 font-mono uppercase tracking-widest pb-2.5 border-b border-border mb-4">
            MEMBER IDENTIFICATION
          </h2>

          <div className="space-y-4">
            {/* Meter ID */}
            <div>
              <label htmlFor="meter_id" className="block text-[10px] font-bold text-text-2 mb-1.5 uppercase font-mono tracking-wider">
                Meter Identifier ID <span className="text-red-accent">*</span>
              </label>
              <input
                type="text"
                id="meter_id"
                value={formData.meter_id}
                onChange={(e) => handleInputChange('meter_id', e.target.value.toUpperCase())}
                className={`w-full px-4 py-2.5 bg-surface-2 border rounded-xl font-mono text-xs text-text-1 focus:outline-none focus:border-teal-accent ${
                  errors.meter_id ? 'border-red-accent' : 'border-border'
                }`}
                placeholder="METER_004"
                disabled={isSubmitting}
              />
              {errors.meter_id && <p className="text-red-accent text-[10px] font-mono font-bold mt-1.5">{errors.meter_id}</p>}
              <p className="text-text-3 text-[9px] mt-1 font-mono">
                Unique identifier string (uppercase characters, numerals, and hyphens/underscores).
              </p>
            </div>

            {/* Meter Name */}
            <div>
              <label htmlFor="name" className="block text-[10px] font-bold text-text-2 mb-1.5 uppercase font-mono tracking-wider">
                Display Name <span className="text-red-accent">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-2.5 bg-surface-2 border rounded-xl text-xs text-text-1 focus:outline-none focus:border-teal-accent ${
                  errors.name ? 'border-red-accent' : 'border-border'
                }`}
                placeholder="Production Line B - Main Panel"
                disabled={isSubmitting}
              />
              {errors.name && <p className="text-red-accent text-[10px] font-mono font-bold mt-1.5">{errors.name}</p>}
              <p className="text-text-3 text-[9px] mt-1 font-mono">Standard label displaying this node in registry listings.</p>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-[10px] font-bold text-text-2 mb-1.5 uppercase font-mono tracking-wider">
                Physical Location <span className="text-red-accent">*</span>
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className={`w-full px-4 py-2.5 bg-surface-2 border rounded-xl text-xs text-text-1 focus:outline-none focus:border-teal-accent ${
                  errors.location ? 'border-red-accent' : 'border-border'
                }`}
                placeholder="Building 2, Level 1, Panel B"
                disabled={isSubmitting}
              />
              {errors.location && <p className="text-red-accent text-[10px] font-mono font-bold mt-1.5">{errors.location}</p>}
              <p className="text-text-3 text-[9px] mt-1 font-mono">Installation location metadata mapping.</p>
            </div>
          </div>
        </div>

        {/* Modbus Configuration */}
        <div>
          <h2 className="text-xs font-bold text-text-3 font-mono uppercase tracking-widest pb-2.5 border-b border-border mb-4">
            MODBUS FIELD BUS SETTINGS
          </h2>

          <div className="space-y-4">
            {/* Modbus Type */}
            <div>
              <label htmlFor="modbus_type" className="block text-[10px] font-bold text-text-2 mb-1.5 uppercase font-mono tracking-wider">
                Communication Bus Protocol <span className="text-red-accent">*</span>
              </label>
              <select
                id="modbus_type"
                value={formData.modbus_type}
                onChange={(e) => handleInputChange('modbus_type', e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-2 border border-border rounded-xl text-xs text-text-2 font-mono focus:outline-none focus:border-teal-accent cursor-pointer"
                disabled={isSubmitting}
              >
                <option value="RTU">RTU (Serial RS-485)</option>
                <option value="TCP">TCP (Modbus TCP/Ethernet)</option>
              </select>
              <p className="text-text-3 text-[9px] mt-1 font-mono">Select serial line bus converter or TCP protocol loop.</p>
            </div>

            {/* Baudrate */}
            {formData.modbus_type === 'RTU' && (
              <div>
                <label htmlFor="baudrate" className="block text-[10px] font-bold text-text-2 mb-1.5 uppercase font-mono tracking-wider">
                  Serial Baud Rate <span className="text-red-accent">*</span>
                </label>
                <select
                  id="baudrate"
                  value={formData.baudrate}
                  onChange={(e) => handleInputChange('baudrate', parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-surface-2 border border-border rounded-xl text-xs text-text-2 font-mono focus:outline-none focus:border-teal-accent cursor-pointer"
                  disabled={isSubmitting}
                >
                  <option value="9600">9600 bps</option>
                  <option value="19200">19200 bps</option>
                  <option value="38400">38400 bps</option>
                  <option value="57600">57600 bps</option>
                  <option value="115200">115200 bps</option>
                </select>
                <p className="text-text-3 text-[9px] mt-1 font-mono">Speed rating configuration for the serial daisy-chain.</p>
              </div>
            )}

            {/* Slave ID */}
            <div>
              <label htmlFor="slave_id" className="block text-[10px] font-bold text-text-2 mb-1.5 uppercase font-mono tracking-wider">
                Slave Node ID <span className="text-red-accent">*</span>
              </label>
              <input
                type="number"
                id="slave_id"
                value={formData.slave_id}
                onChange={(e) => handleInputChange('slave_id', parseInt(e.target.value))}
                className={`w-full px-4 py-2.5 bg-surface-2 border rounded-xl font-mono text-xs text-text-1 focus:outline-none focus:border-teal-accent ${
                  errors.slave_id ? 'border-red-accent' : 'border-border'
                }`}
                min="1"
                max="247"
                disabled={isSubmitting}
              />
              {errors.slave_id && <p className="text-red-accent text-[10px] font-mono font-bold mt-1.5">{errors.slave_id}</p>}
              <p className="text-text-3 text-[9px] mt-1 font-mono">Modbus bus slave address registry index (1-247).</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-teal-accent/5 border border-teal-accent/20 rounded-2xl p-4 flex gap-3 items-start">
          <Info className="text-teal-accent flex-shrink-0 mt-0.5" size={16} />
          <div className="text-xs font-sans text-text-2 leading-relaxed">
            <span className="font-bold text-text-1 block mb-0.5">Schneider PM8000 Registers</span>
            The system applies default Modbus register definitions: Voltage (0), Current (6), Active Power (12), PF (30).
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => router.push('/meters')}
            className="flex-1 px-5 py-2.5 border border-border text-text-2 font-mono text-xs uppercase tracking-wider font-bold rounded-full hover:bg-surface-2 transition-all cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 bg-teal-accent hover:bg-teal-accent/90 text-bg font-mono text-xs uppercase tracking-wider font-bold rounded-full transition-all cursor-pointer disabled:bg-surface-2 disabled:text-text-3 disabled:cursor-not-allowed border border-transparent"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-bg border-t-transparent rounded-full animate-spin"></div>
                Mapping Node...
              </>
            ) : (
              <>
                <Save size={16} />
                Register Node
              </>
            )}
          </button>
        </div>
      </form>

      {/* Help Section */}
      <div className="bg-surface border border-border rounded-3xl p-5 shadow-sm">
        <h3 className="text-xs font-bold font-display text-text-1 uppercase tracking-wider mb-2.5">Field Installation Help</h3>
        <ul className="text-[11px] text-text-2 space-y-2 font-sans leading-relaxed">
          <li className="flex gap-2 items-start">
            <span className="text-teal-accent font-bold font-mono">1.</span>
            <span>Ensure slave baudrate configurations match settings inside physical meter screens.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="text-teal-accent font-bold font-mono">2.</span>
            <span>Assign distinct Slave Node IDs (1-247) to each physical sub-meter on the daisy-chain line.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="text-teal-accent font-bold font-mono">3.</span>
            <span>Ensure the ESP32 edge gateway firmware configuration uses the same Meter ID register string.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
