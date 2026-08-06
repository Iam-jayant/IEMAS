import asyncio
import logging
import random
from datetime import datetime, timezone

from .models import MeterReading, MachineProfile, SimulatorConfig, SimulatorState
from .operation_cycle import OperationCycleManager
from .electrical_parameters import ElectricalParameterGenerator
from .alerts import ThresholdAlertGenerator
from .http_client import HTTPClient

logger = logging.getLogger(__name__)

class MachineSimulator:
    """
    Simulates a single industrial machine's operation and meter readings.
    """
    def __init__(
        self, 
        meter_id: str, 
        profile: MachineProfile, 
        config: SimulatorConfig, 
        http_client: HTTPClient,
        state: SimulatorState
    ):
        self.meter_id = meter_id
        self.profile = profile
        self.config = config
        self.http_client = http_client
        self.state = state
        
        self.cycle_manager = OperationCycleManager(profile)
        self.cumulative_energy_kwh = 0.0
        self.start_time = datetime.now(timezone.utc)
        self.last_wifi_rssi = -55
        self.alert_generator = ThresholdAlertGenerator(config.alert_probability)

    def update_cumulative_energy(self, active_power_kw: float, interval_seconds: int):
        """Update cumulative energy based on active power and time interval."""
        time_hours = interval_seconds / 3600.0
        energy_increment = active_power_kw * time_hours
        self.cumulative_energy_kwh += energy_increment

    def generate_wifi_rssi(self) -> int:
        """Generate WiFi RSSI with random walk between -70 and -40 dBm."""
        change = random.randint(-3, 3)
        self.last_wifi_rssi += change
        # Clamp between -70 and -40
        self.last_wifi_rssi = max(-70, min(-40, self.last_wifi_rssi))
        return self.last_wifi_rssi

    def generate_reading(self) -> MeterReading:
        """Generate a complete meter reading for the current state."""
        # Get base parameters
        active_power = self.cycle_manager.get_power_level(self.profile)
        pf = ElectricalParameterGenerator.generate_power_factor()
        
        # Apply alerts if needed
        is_alert = self.alert_generator.should_generate_alert()
        if is_alert:
            alert_type = random.choice(["high_power", "low_pf"])
            if alert_type == "high_power":
                active_power = self.alert_generator.apply_high_power_alert(self.profile, active_power)
                logger.info(f"[{self.meter_id}] Alert generated: High Power ({active_power:.2f}kW)")
            else:
                pf = self.alert_generator.apply_low_power_factor_alert(pf)
                logger.info(f"[{self.meter_id}] Alert generated: Low Power Factor ({pf:.2f})")

        # Generate other electrical parameters
        voltage = ElectricalParameterGenerator.generate_voltage()
        frequency = ElectricalParameterGenerator.generate_frequency()
        current = ElectricalParameterGenerator.calculate_current(active_power, voltage, pf)
        apparent_power = ElectricalParameterGenerator.calculate_apparent_power(active_power, pf)
        reactive_power = ElectricalParameterGenerator.calculate_reactive_power(apparent_power, active_power)
        
        # Update state and metadata
        self.update_cumulative_energy(active_power, self.config.interval_seconds)
        
        uptime_seconds = int((datetime.now(timezone.utc) - self.start_time).total_seconds())
        wifi_rssi = self.generate_wifi_rssi()
        
        # ISO 8601 with Z
        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        
        reading = MeterReading(
            meter_id=self.meter_id,
            timestamp=timestamp,
            voltage=voltage,
            current=current,
            active_power=active_power,
            reactive_power=reactive_power,
            apparent_power=apparent_power,
            power_factor=pf,
            frequency=frequency,
            cumulative_energy=self.cumulative_energy_kwh,
            firmware_version="v2.0.0-simulator",
            uptime_seconds=uptime_seconds,
            wifi_rssi=wifi_rssi
        )
        
        # Advance cycle for next reading
        old_state = self.cycle_manager.state
        self.cycle_manager.advance_cycle()
        if old_state != self.cycle_manager.state:
            logger.info(f"[{self.meter_id}] State transition: {old_state.name} -> {self.cycle_manager.state.name}")
            
        return reading

    async def run(self):
        """Main simulation loop for this machine."""
        logger.info(f"Started simulator for machine {self.meter_id}")
        
        while self.state.running:
            try:
                reading = self.generate_reading()
                await self.http_client.send_reading(reading)
            except Exception as e:
                logger.error(f"[{self.meter_id}] Error in simulation loop: {e}", exc_info=True)
                
            # Sleep with jitter
            jitter = random.uniform(-5.0, 5.0)
            sleep_time = self.config.interval_seconds + jitter
            sleep_time = max(55.0, sleep_time)
            
            await asyncio.sleep(sleep_time)
            
        logger.info(f"Stopped simulator for machine {self.meter_id}. Final energy: {self.cumulative_energy_kwh:.2f} kWh")
