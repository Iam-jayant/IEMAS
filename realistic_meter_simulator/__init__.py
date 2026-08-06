"""
Realistic Meter Simulator Package

A Python-based development and testing tool that simulates three industrial machines
(HMC, VMC, CNC) generating and transmitting realistic electrical meter readings to
the IEMAS backend API.
"""

__version__ = "1.0.0"

# Import key classes for easy access
from .models import MeterReading, SimulatorConfig, MachineProfile, SimulatorState
from .electrical_parameters import ElectricalParameterGenerator

__all__ = [
    "MeterReading",
    "SimulatorConfig", 
    "MachineProfile",
    "SimulatorState",
    "ElectricalParameterGenerator",
]
