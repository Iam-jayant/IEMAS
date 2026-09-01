'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertTriangle, CheckCircle, Info, Cpu } from 'lucide-react';
import { api } from '@/lib/api';

interface MeterFormData {
  meter_id: string;
  name: string;
  location: string;
  model_preset: string;
  modbus_type: 'RTU' | 'TCP';
  baudrate: number;
  slave_id: number;
  word_order: 'ABCD' | 'CDAB';
  registers: {
    voltage: number;
    current: number;
    active_power: number;
    reactive_power: number;
    apparent_power: number;
    power_factor: number;
    frequency: number;
    energy: number;
  };
}

const SCHNEIDER_PRESETS: Record<string, {
  name: string;
  description: string;
  baudrate: number;
  word_order: 'ABCD' | 'CDAB';
  registers: MeterFormData['registers'];
}> = {
  EM6433H: {
    name: 'Schneider Electric EM6433H / EM64XXH (Active Bench Profile)',
    description: 'Proven Modbus registers: Energy (2699), Power (3059), Current (3009), 9600 8-E-1',
    baudrate: 9600,
    word_order: 'ABCD',
    registers: {
      voltage: 3027,
      current: 3009,
      active_power: 3059,
      reactive_power: 3067,
      apparent_power: 3075,
      power_factor: 3083,
      frequency: 3109,
      energy: 2699,
    },
  },
  PM2200: {
    name: 'Schneider EasyLogic PM2120 / PM2220',
    description: 'Modern 3000-series registers, 32-bit Float Big-Endian (ABCD)',
    baudrate: 9600,
    word_order: 'ABCD',
    registers: {
      voltage: 3027,
      current: 3009,
      active_power: 3059,
      reactive_power: 3067,
      apparent_power: 3075,
      power_factor: 3083,
      frequency: 3109,
      energy: 3203,
    },
  },
  EM6400: {
    name: 'Schneider Conzerv EM6400 / EM6436 (PMCC Panel)',
    description: 'Classic PMCC panel meter, 3900-series registers (ABCD)',
    baudrate: 9600,
    word_order: 'ABCD',
    registers: {
      voltage: 3908,
      current: 3900,
      active_power: 3912,
      reactive_power: 3914,
      apparent_power: 3916,
      power_factor: 3918,
      frequency: 3920,
      energy: 3926,
    },
  },
  PM1200: {
    name: 'Schneider PowerLogic PM1200 (Legacy Conzerv)',
    description: 'Legacy Conzerv meter, Word-Swapped Float (CDAB)',
    baudrate: 9600,
    word_order: 'CDAB',
    registers: {
      voltage: 3908,
      current: 3900,
      active_power: 3912,
      reactive_power: 3914,
      apparent_power: 3916,
      power_factor: 3918,
      frequency: 3920,
      energy: 3926,
    },
  },
  PM5000: {
    name: 'Schneider PowerLogic PM5100 / PM5300',
    description: 'High-precision multi-function meter, 19200 baud default (ABCD)',
    baudrate: 19200,
    word_order: 'ABCD',
    registers: {
      voltage: 3027,
      current: 3009,
      active_power: 3059,
      reactive_power: 3067,
      apparent_power: 3075,
      power_factor: 3083,
      frequency: 3109,
      energy: 3203,
    },
  },
  CUSTOM: {
    name: 'Custom / Other Modbus Meter',
    description: 'Custom holding register map',
    baudrate: 9600,
    word_order: 'ABCD',
    registers: {
      voltage: 3027,
      current: 3009,
      active_power: 3059,
      reactive_power: 3067,
      apparent_power: 3075,
      power_factor: 3083,
      frequency: 3109,
      energy: 3203,
    },
  },
};

export default function RegisterMeterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<MeterFormData>({
    meter_id: 'cnc dx250',
    name: 'Schneider EM6433H - Panel Meter',
    location: 'PMCC Panel 1',
    model_preset: 'EM6433H',
    modbus_type: 'RTU',
    baudrate: 9600,
    slave_id: 3,
    word_order: 'ABCD',
    registers: { ...SCHNEIDER_PRESETS.EM6433H.registers },
  });

  const [showAdvancedRegisters, setShowAdvancedRegisters] = useState(false);
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

  const handlePresetChange = (presetKey: string) => {
    const preset = SCHNEIDER_PRESETS[presetKey];
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        model_preset: presetKey,
        baudrate: preset.baudrate,
        word_order: preset.word_order,
        registers: { ...preset.registers },
      }));
    }
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

  const handleRegisterChange = (regKey: keyof MeterFormData['registers'], val: number) => {
    setFormData((prev) => ({
      ...prev,
      registers: {
        ...prev.registers,
        [regKey]: val,
      },
    }));
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
        model: formData.model_preset,
        type: formData.modbus_type,
        baudrate: formData.baudrate,
        slave_id: formData.slave_id,
        word_order: formData.word_order,
        registers: formData.registers,
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
          <p className="text-xs text-text-2 mt-0.5">Map a physical Schneider Electric meter into the IEMAS registry.</p>
        </div>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="bg-red-accent/5 border border-red-accent/20 rounded-3xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-accent flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold font-mono text-red-accent uppercase tracking-wider mb-1">Registration Blocked</h3>
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
                placeholder="PMCC_MTR_01"
                disabled={isSubmitting}
              />
              {errors.meter_id && <p className="text-red-accent text-[10px] font-mono font-bold mt-1.5">{errors.meter_id}</p>}
              <p className="text-text-3 text-[9px] mt-1 font-mono">
                Unique identifier string matching edge ESP32 config.json (e.g. PMCC_MTR_01, MCH_LATHE_01).
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
                placeholder="PMCC Panel 1 - Incomer"
                disabled={isSubmitting}
              />
              {errors.name && <p className="text-red-accent text-[10px] font-mono font-bold mt-1.5">{errors.name}</p>}
              <p className="text-text-3 text-[9px] mt-1 font-mono">Standard label displaying this node in dashboard and alerts.</p>
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
                placeholder="Main Substation / PMCC Room - Panel A"
                disabled={isSubmitting}
              />
              {errors.location && <p className="text-red-accent text-[10px] font-mono font-bold mt-1.5">{errors.location}</p>}
              <p className="text-text-3 text-[9px] mt-1 font-mono">Physical installation panel or machine location.</p>
            </div>
          </div>
        </div>

        {/* Schneider Electric Meter Model Profile */}
        <div>
          <h2 className="text-xs font-bold text-text-3 font-mono uppercase tracking-widest pb-2.5 border-b border-border mb-4 flex items-center justify-between">
            <span>SCHNEIDER ELECTRIC MODEL PROFILE</span>
            <span className="text-[10px] text-teal-accent lowercase font-normal">auto-populates modbus map</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="model_preset" className="block text-[10px] font-bold text-text-2 mb-1.5 uppercase font-mono tracking-wider">
                Select Schneider Model Preset <span className="text-red-accent">*</span>
              </label>
              <select
                id="model_preset"
                value={formData.model_preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-2 border border-border rounded-xl text-xs text-text-1 font-mono focus:outline-none focus:border-teal-accent cursor-pointer"
                disabled={isSubmitting}
              >
                {Object.entries(SCHNEIDER_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <p className="text-text-3 text-[9px] mt-1 font-mono">
                {SCHNEIDER_PRESETS[formData.model_preset]?.description}
              </p>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Baudrate */}
              {formData.modbus_type === 'RTU' && (
                <div>
                  <label htmlFor="baudrate" className="block text-[10px] font-bold text-text-2 mb-1.5 uppercase font-mono tracking-wider">
                    Baud Rate <span className="text-red-accent">*</span>
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
              </div>

              {/* Word Order */}
              <div>
                <label htmlFor="word_order" className="block text-[10px] font-bold text-text-2 mb-1.5 uppercase font-mono tracking-wider">
                  Float Word Order
                </label>
                <select
                  id="word_order"
                  value={formData.word_order}
                  onChange={(e) => handleInputChange('word_order', e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-2 border border-border rounded-xl text-xs text-text-2 font-mono focus:outline-none focus:border-teal-accent cursor-pointer"
                  disabled={isSubmitting}
                >
                  <option value="ABCD">Big-Endian (ABCD)</option>
                  <option value="CDAB">Word-Swapped (CDAB)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Advanced Register Customization */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvancedRegisters(!showAdvancedRegisters)}
            className="text-[11px] font-mono text-teal-accent hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Cpu size={14} />
            {showAdvancedRegisters ? 'Hide Register Address Mapping' : 'Customize Modbus Register Addresses'}
          </button>

          {showAdvancedRegisters && (
            <div className="mt-3 p-4 bg-surface-2 border border-border rounded-2xl space-y-3">
              <p className="text-[10px] font-mono text-text-3">
                Specify base holding register addresses (0-indexed or 1-indexed according to meter manual):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(formData.registers).map(([param, regVal]) => (
                  <div key={param}>
                    <label className="block text-[9px] font-mono uppercase text-text-2 mb-1 truncate">
                      {param.replace('_', ' ')}
                    </label>
                    <input
                      type="number"
                      value={regVal}
                      onChange={(e) => handleRegisterChange(param as keyof MeterFormData['registers'], parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-mono text-text-1 focus:outline-none focus:border-teal-accent"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-teal-accent/5 border border-teal-accent/20 rounded-2xl p-4 flex gap-3 items-start">
          <Info className="text-teal-accent flex-shrink-0 mt-0.5" size={16} />
          <div className="text-xs font-sans text-text-2 leading-relaxed">
            <span className="font-bold text-text-1 block mb-0.5">Active Schneider Profile: {SCHNEIDER_PRESETS[formData.model_preset]?.name}</span>
            Voltage: <span className="font-mono text-teal-accent">{formData.registers.voltage}</span> | Current: <span className="font-mono text-teal-accent">{formData.registers.current}</span> | Active Power: <span className="font-mono text-teal-accent">{formData.registers.active_power}</span> | Energy: <span className="font-mono text-teal-accent">{formData.registers.energy}</span> | Word Order: <span className="font-mono text-teal-accent">{formData.word_order}</span>.
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

      {/* Field Installation Guidelines */}
      <div className="bg-surface border border-border rounded-3xl p-5 shadow-sm">
        <h3 className="text-xs font-bold font-display text-text-1 uppercase tracking-wider mb-2.5">Field Installation Guidelines</h3>
        <ul className="text-[11px] text-text-2 space-y-2 font-sans leading-relaxed">
          <li className="flex gap-2 items-start">
            <span className="text-teal-accent font-bold font-mono">1.</span>
            <span>Ensure the RS-485 A(+) and B(-) wiring polarity matches between the Schneider meter terminals and the ESP32 transceiver.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="text-teal-accent font-bold font-mono">2.</span>
            <span>Assign distinct Modbus Slave IDs (1 to 247) to every meter daisy-chained on the same PMCC bus line.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="text-teal-accent font-bold font-mono">3.</span>
            <span>Flash the corresponding <span className="font-mono text-teal-accent">meter_id</span> into the ESP32 <span className="font-mono text-teal-accent">config.json</span> before deploying onto the machine panel.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
