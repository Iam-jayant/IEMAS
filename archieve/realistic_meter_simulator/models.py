"""
Data Models for Realistic Meter Simulator

This module defines the core data structures used throughout the simulator:
- MeterReading: Complete meter reading with electrical parameters and firmware metadata
- SimulatorConfig: Configuration parameters for the simulator
- MachineProfile: Machine-specific power characteristics
- SimulatorState: Runtime state tracking
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional
from datetime import datetime


@dataclass
class MeterReading:
    """
    Complete meter reading with all electrical parameters and firmware metadata.
    
    This structure matches the MeterReadingCreate schema from the IEMAS backend
    to ensure API compatibility.
    """
    meter_id: str
    timestamp: str  # ISO 8601 format with Z suffix (e.g., "2024-01-15T10:30:00Z")
    voltage: float  # Volts (V) - realistic range: 220-240V
    current: float  # Amperes (A) - calculated from power, voltage, and power factor
    active_power: float  # Kilowatts (kW) - real power consumed
    reactive_power: float  # Kilovolt-amperes reactive (kVAR) - can be negative
    apparent_power: float  # Kilovolt-amperes (kVA) - total power
    power_factor: float  # Dimensionless ratio -1.0 to 1.0 (realistic: 0.85-0.98)
    frequency: float  # Hertz (Hz) - realistic range: 49.8-50.2Hz
    cumulative_energy: float  # Kilowatt-hours (kWh) - monotonically increasing
    firmware_version: str  # Version string (e.g., "v2.0.0-simulator")
    uptime_seconds: int  # Device uptime in seconds
    wifi_rssi: int  # WiFi signal strength in dBm (range: -100 to 0)
    
    def to_json(self) -> dict:
        """
        Convert MeterReading to JSON dictionary for API transmission.
        
        Returns:
            dict: JSON-serializable dictionary matching MeterReadingCreate schema
        """
        return asdict(self)


@dataclass
class SimulatorConfig:
    """
    Configuration parameters for the simulator.
    
    These values control simulator behavior including API endpoint,
    transmission timing, and alert generation probability.
    """
    api_url: str = "http://localhost:8000/api/readings"
    interval_seconds: int = 60  # Range: 60-120 seconds
    alert_probability: float = 0.05  # Range: 0.0-1.0 (5% default)
    
    def validate(self) -> None:
        """
        Validate configuration parameters.
        
        Raises:
            ValueError: If any configuration parameter is invalid
        """
        if not self.api_url.startswith(("http://", "https://")):
            raise ValueError(f"Invalid API URL: {self.api_url}")
        
        if not 60 <= self.interval_seconds <= 120:
            raise ValueError(
                f"interval_seconds must be between 60-120, got {self.interval_seconds}"
            )
        
        if not 0.0 <= self.alert_probability <= 1.0:
            raise ValueError(
                f"alert_probability must be between 0.0-1.0, got {self.alert_probability}"
            )


@dataclass
class MachineProfile:
    """
    Machine-specific power characteristics.
    
    Defines the power consumption parameters for each type of industrial machine.
    These profiles determine the range of power values during operation cycles.
    """
    meter_id: str
    max_power_kw: float  # Maximum power during operation (kW)
    idle_power_kw: float  # Power consumption when idle (kW)


# Pre-defined machine profile constants
# These represent typical industrial machine power characteristics

# Horizontal Machining Center - High-power industrial machine
MachineProfile.HMC = MachineProfile(
    meter_id="HMC",
    max_power_kw=25.0,
    idle_power_kw=2.5
)

# Vertical Machining Center - Medium-power industrial machine
MachineProfile.VMC = MachineProfile(
    meter_id="VMC",
    max_power_kw=18.0,
    idle_power_kw=1.8
)

# CNC Lathe - Lower-power industrial machine
MachineProfile.CNC = MachineProfile(
    meter_id="CNC",
    max_power_kw=15.0,
    idle_power_kw=1.5
)


@dataclass
class SimulatorState:
    """
    Runtime state tracking for the simulator.
    
    This dataclass maintains global state for clean shutdown and
    resource management across all machine simulators.
    """
    running: bool = True  # Global running flag for graceful shutdown
    machines: List = field(default_factory=list)  # List of MachineSimulator instances
    http_client: Optional[object] = None  # HTTP client instance (type hint as object to avoid circular import)
