"""
Electrical Parameter Generator for Realistic Meter Simulator

This module generates realistic electrical parameters for industrial machines
including voltage, current, power factor, frequency, and power calculations.
"""

import random
import math


class ElectricalParameterGenerator:
    """
    Generates realistic electrical parameters and calculates derived values.
    
    This class provides static methods for:
    - Generating base electrical parameters (voltage, power factor, frequency)
    - Calculating derived parameters (current, apparent power, reactive power)
    
    All methods are static as they are stateless transformations following
    standard electrical engineering formulas.
    """
    
    @staticmethod
    def generate_voltage() -> float:
        """
        Generate realistic voltage value for industrial power supply.
        
        Returns:
            float: Voltage in Volts (V), range: 220-240V with ±2V random fluctuation
            
        The base voltage is randomly selected from the 220-240V range, then
        a small fluctuation (±2V) is applied to simulate real-world variations.
        """
        base_voltage = random.uniform(220.0, 240.0)
        fluctuation = random.uniform(-2.0, 2.0)
        return base_voltage + fluctuation
    
    @staticmethod
    def generate_power_factor() -> float:
        """
        Generate realistic power factor for industrial equipment.
        
        Returns:
            float: Power factor (dimensionless), range: 0.85-0.98
            
        Industrial equipment typically operates with power factors in this range.
        Lower values indicate more reactive power (inductive loads like motors).
        Values closer to 1.0 indicate more efficient power usage.
        """
        return random.uniform(0.85, 0.98)
    
    @staticmethod
    def generate_frequency() -> float:
        """
        Generate realistic AC frequency with small fluctuations.
        
        Returns:
            float: Frequency in Hertz (Hz), range: 49.8-50.2 Hz
            
        Standard AC power frequency is 50 Hz in most countries (60 Hz in North America).
        This simulator uses 50 Hz base with small realistic fluctuations.
        """
        return random.uniform(49.8, 50.2)
    
    @staticmethod
    def calculate_current(active_power_kw: float, voltage: float, power_factor: float) -> float:
        """
        Calculate current from active power, voltage, and power factor.
        
        Args:
            active_power_kw: Active power in kilowatts (kW)
            voltage: Voltage in volts (V)
            power_factor: Power factor (dimensionless, typically 0.85-0.98)
            
        Returns:
            float: Current in amperes (A)
            
        Formula: I = (P × 1000) / (V × PF)
        
        Where:
        - I = Current (A)
        - P = Active Power (kW)
        - V = Voltage (V)
        - PF = Power Factor (dimensionless)
        
        The factor of 1000 converts kilowatts to watts.
        """
        # Convert kW to W, then divide by voltage and power factor
        active_power_w = active_power_kw * 1000.0
        current = active_power_w / (voltage * power_factor)
        return current
    
    @staticmethod
    def calculate_apparent_power(active_power_kw: float, power_factor: float) -> float:
        """
        Calculate apparent power from active power and power factor.
        
        Args:
            active_power_kw: Active power in kilowatts (kW)
            power_factor: Power factor (dimensionless, typically 0.85-0.98)
            
        Returns:
            float: Apparent power in kilovolt-amperes (kVA)
            
        Formula: S = P / PF
        
        Where:
        - S = Apparent Power (kVA)
        - P = Active Power (kW)
        - PF = Power Factor (dimensionless)
        
        Apparent power represents the total power flow in the circuit,
        including both active (real) and reactive components.
        """
        apparent_power = active_power_kw / power_factor
        return apparent_power
    
    @staticmethod
    def calculate_reactive_power(apparent_power: float, active_power: float) -> float:
        """
        Calculate reactive power from apparent and active power.
        
        Args:
            apparent_power: Apparent power in kilovolt-amperes (kVA)
            active_power: Active power in kilowatts (kW)
            
        Returns:
            float: Reactive power in kilovolt-amperes reactive (kVAR)
            
        Formula: Q = √(S² - P²)
        
        Where:
        - Q = Reactive Power (kVAR)
        - S = Apparent Power (kVA)
        - P = Active Power (kW)
        
        This implements the Pythagorean relationship between active,
        reactive, and apparent power in AC circuits. Reactive power
        represents the power that oscillates between source and load
        without doing useful work (typically from inductive loads).
        """
        # Use Pythagorean theorem: Q = sqrt(S^2 - P^2)
        s_squared = apparent_power ** 2
        p_squared = active_power ** 2
        
        # Handle floating point precision issues where P might be slightly > S
        if s_squared < p_squared:
            # This shouldn't happen mathematically, but can occur due to floating point
            # In this case, reactive power is essentially zero
            return 0.0
        
        q_squared = s_squared - p_squared
        reactive_power = math.sqrt(q_squared)
        
        return reactive_power
