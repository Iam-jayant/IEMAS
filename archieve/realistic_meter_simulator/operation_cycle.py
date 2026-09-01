"""
Operation Cycle Manager for Realistic Meter Simulator

This module manages machine operation state transitions and power level calculations.
Each machine cycles through IDLE → STARTUP → OPERATION → COOLDOWN states with
realistic timing and power consumption patterns.
"""

import random
from enum import Enum
from .models import MachineProfile


class OperationState(Enum):
    """
    Machine operation states representing realistic operation cycles.
    
    State Transitions:
    IDLE → STARTUP → OPERATION → COOLDOWN → IDLE (repeats)
    
    Each state has characteristic power consumption patterns and duration.
    """
    IDLE = "idle"
    STARTUP = "startup"
    OPERATION = "operation"
    COOLDOWN = "cooldown"


class OperationCycleManager:
    """
    Manages machine operation state transitions and power level calculations.
    
    Each machine independently cycles through operation states with randomized
    durations to simulate realistic industrial equipment behavior. The state
    machine determines the current power consumption level based on the
    machine's state and progress within that state.
    
    Attributes:
        state: Current operation state
        intervals_in_state: Number of reading intervals spent in current state
        target_intervals: Target number of intervals before transitioning to next state
        profile: Machine profile with power characteristics
    """
    
    def __init__(self, profile: MachineProfile):
        """
        Initialize operation cycle manager in IDLE state.
        
        Args:
            profile: Machine profile defining power characteristics
        """
        self.profile = profile
        self.state = OperationState.IDLE
        self.intervals_in_state = 0
        self.target_intervals = self._random_target_for_state()
    
    def _random_target_for_state(self) -> int:
        """
        Generate random target interval count for the current state.
        
        Returns:
            int: Number of intervals to remain in current state
            
        Duration ranges by state:
        - IDLE: 5-15 intervals (machine sitting idle between jobs)
        - STARTUP: 3-5 intervals (warming up, spindle acceleration)
        - OPERATION: 10-30 intervals (active machining work)
        - COOLDOWN: 2-4 intervals (spindle deceleration, cooling)
        """
        if self.state == OperationState.IDLE:
            return random.randint(5, 15)
        elif self.state == OperationState.STARTUP:
            return random.randint(3, 5)
        elif self.state == OperationState.OPERATION:
            return random.randint(10, 30)
        elif self.state == OperationState.COOLDOWN:
            return random.randint(2, 4)
        else:
            # Default fallback (should never reach here)
            return 10
    
    def _transition_to_next_state(self) -> None:
        """
        Transition to the next state in the operation cycle.
        
        State sequence: IDLE → STARTUP → OPERATION → COOLDOWN → IDLE
        
        This method updates the state attribute to the next state in the cycle.
        It does NOT reset intervals_in_state or generate new target_intervals -
        that is handled by the advance_cycle() method after calling this.
        """
        if self.state == OperationState.IDLE:
            self.state = OperationState.STARTUP
        elif self.state == OperationState.STARTUP:
            self.state = OperationState.OPERATION
        elif self.state == OperationState.OPERATION:
            self.state = OperationState.COOLDOWN
        elif self.state == OperationState.COOLDOWN:
            self.state = OperationState.IDLE
    
    def get_power_level(self, profile: MachineProfile) -> float:
        """
        Calculate active power level based on current state and progress.
        
        Args:
            profile: Machine profile with max_power_kw and idle_power_kw
            
        Returns:
            float: Active power in kilowatts (kW)
            
        Power calculation by state:
        - IDLE: Returns idle power (10% of max)
        - STARTUP: Linear interpolation from idle to operation power
        - OPERATION: 80-100% of max power with ±5% random variation
        - COOLDOWN: Linear interpolation from operation power to idle
        
        The interpolation during STARTUP and COOLDOWN creates smooth power
        transitions that mimic real machine behavior (gradual spindle acceleration
        and deceleration).
        """
        if self.state == OperationState.IDLE:
            # Machine is idle - consuming only standby power
            return profile.idle_power_kw
        
        elif self.state == OperationState.STARTUP:
            # Linear interpolation from idle to operation power
            # Progress: 0.0 (just entered startup) to 1.0 (about to enter operation)
            progress = self.intervals_in_state / self.target_intervals
            
            idle_power = profile.idle_power_kw
            # Target operation power: 80-100% of max (random for variation)
            operation_power = profile.max_power_kw * random.uniform(0.8, 1.0)
            
            # Interpolate: power = idle + (operation - idle) * progress
            return idle_power + (operation_power - idle_power) * progress
        
        elif self.state == OperationState.OPERATION:
            # Machine is actively operating - high power with random variation
            # Base power: 80-100% of max
            base_power = profile.max_power_kw * random.uniform(0.8, 1.0)
            
            # Add small random variation (±5%) to simulate load changes
            variation = random.uniform(-0.05, 0.05)
            return base_power * (1.0 + variation)
        
        elif self.state == OperationState.COOLDOWN:
            # Linear interpolation from operation power to idle
            # Progress: 0.0 (just entered cooldown) to 1.0 (about to enter idle)
            progress = self.intervals_in_state / self.target_intervals
            
            # Assume average operation power for cooldown starting point
            operation_power = profile.max_power_kw * 0.9  # 90% average
            idle_power = profile.idle_power_kw
            
            # Interpolate: power = operation - (operation - idle) * progress
            return operation_power - (operation_power - idle_power) * progress
        
        else:
            # Default fallback (should never reach here)
            return profile.idle_power_kw
    
    def advance_cycle(self) -> None:
        """
        Advance the operation cycle by one reading interval.
        
        This method:
        1. Increments intervals_in_state counter
        2. Checks if target_intervals has been reached
        3. If so, transitions to next state and resets counters
        
        This should be called after each reading is generated to maintain
        accurate state timing. The state machine ensures realistic operation
        patterns with randomized durations.
        """
        self.intervals_in_state += 1
        
        # Check if we've reached the target duration for this state
        if self.intervals_in_state >= self.target_intervals:
            # Transition to next state
            self._transition_to_next_state()
            
            # Reset counters for new state
            self.intervals_in_state = 0
            self.target_intervals = self._random_target_for_state()
