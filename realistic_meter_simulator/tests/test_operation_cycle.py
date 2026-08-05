"""
Unit Tests for Operation Cycle Manager

This module tests the operation cycle state machine including state transitions,
power level calculations, and timing behavior to ensure realistic machine operation simulation.
"""

import pytest
from realistic_meter_simulator.operation_cycle import OperationState, OperationCycleManager
from realistic_meter_simulator.models import MachineProfile


class TestOperationState:
    """Test suite for OperationState enum"""
    
    def test_operation_state_values(self):
        """Test that all operation states have correct string values"""
        assert OperationState.IDLE.value == "idle"
        assert OperationState.STARTUP.value == "startup"
        assert OperationState.OPERATION.value == "operation"
        assert OperationState.COOLDOWN.value == "cooldown"
    
    def test_operation_state_enum_members(self):
        """Test that all expected enum members exist"""
        states = [state for state in OperationState]
        assert len(states) == 4
        assert OperationState.IDLE in states
        assert OperationState.STARTUP in states
        assert OperationState.OPERATION in states
        assert OperationState.COOLDOWN in states


class TestOperationCycleManagerInitialization:
    """Test suite for OperationCycleManager initialization"""
    
    def test_initializes_in_idle_state(self):
        """Test that manager initializes in IDLE state (Requirement 3.6)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        
        assert manager.state == OperationState.IDLE
    
    def test_initializes_intervals_in_state_to_zero(self):
        """Test that intervals_in_state starts at 0 (Requirement 3.7)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        
        assert manager.intervals_in_state == 0
    
    def test_initializes_with_random_target_intervals(self):
        """Test that target_intervals is set on initialization (Requirement 3.7)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        
        # For IDLE state, target should be 5-15
        assert 5 <= manager.target_intervals <= 15
    
    def test_stores_machine_profile(self):
        """Test that machine profile is stored"""
        profile = MachineProfile.VMC
        manager = OperationCycleManager(profile)
        
        assert manager.profile == profile
        assert manager.profile.meter_id == "VMC"


class TestRandomTargetGeneration:
    """Test suite for _random_target_for_state method"""
    
    def test_idle_target_range(self):
        """Test IDLE state target intervals: 5-15 (Requirement 3.6)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.IDLE
        
        # Test multiple times to verify randomness and range
        for _ in range(50):
            target = manager._random_target_for_state()
            assert 5 <= target <= 15, f"IDLE target {target} outside range 5-15"
    
    def test_startup_target_range(self):
        """Test STARTUP state target intervals: 3-5 (Requirement 3.7)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.STARTUP
        
        for _ in range(50):
            target = manager._random_target_for_state()
            assert 3 <= target <= 5, f"STARTUP target {target} outside range 3-5"
    
    def test_operation_target_range(self):
        """Test OPERATION state target intervals: 10-30 (Requirement 3.5)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.OPERATION
        
        for _ in range(50):
            target = manager._random_target_for_state()
            assert 10 <= target <= 30, f"OPERATION target {target} outside range 10-30"
    
    def test_cooldown_target_range(self):
        """Test COOLDOWN state target intervals: 2-4 (Requirement 3.7)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.COOLDOWN
        
        for _ in range(50):
            target = manager._random_target_for_state()
            assert 2 <= target <= 4, f"COOLDOWN target {target} outside range 2-4"


class TestStateTransitions:
    """Test suite for _transition_to_next_state method"""
    
    def test_idle_to_startup_transition(self):
        """Test IDLE → STARTUP transition (Requirement 3.7)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.IDLE
        
        manager._transition_to_next_state()
        
        assert manager.state == OperationState.STARTUP
    
    def test_startup_to_operation_transition(self):
        """Test STARTUP → OPERATION transition (Requirement 3.7)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.STARTUP
        
        manager._transition_to_next_state()
        
        assert manager.state == OperationState.OPERATION
    
    def test_operation_to_cooldown_transition(self):
        """Test OPERATION → COOLDOWN transition (Requirement 3.5)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.OPERATION
        
        manager._transition_to_next_state()
        
        assert manager.state == OperationState.COOLDOWN
    
    def test_cooldown_to_idle_transition(self):
        """Test COOLDOWN → IDLE transition (Requirement 3.7)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.COOLDOWN
        
        manager._transition_to_next_state()
        
        assert manager.state == OperationState.IDLE
    
    def test_complete_cycle_sequence(self):
        """Test complete cycle: IDLE → STARTUP → OPERATION → COOLDOWN → IDLE"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        
        # Start in IDLE
        assert manager.state == OperationState.IDLE
        
        # IDLE → STARTUP
        manager._transition_to_next_state()
        assert manager.state == OperationState.STARTUP
        
        # STARTUP → OPERATION
        manager._transition_to_next_state()
        assert manager.state == OperationState.OPERATION
        
        # OPERATION → COOLDOWN
        manager._transition_to_next_state()
        assert manager.state == OperationState.COOLDOWN
        
        # COOLDOWN → IDLE (cycle complete)
        manager._transition_to_next_state()
        assert manager.state == OperationState.IDLE


class TestPowerLevelCalculation:
    """Test suite for get_power_level method"""
    
    def test_idle_power_level(self):
        """Test IDLE state returns idle power (Requirement 3.1)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.IDLE
        
        power = manager.get_power_level(profile)
        
        assert power == profile.idle_power_kw
        assert power == 2.5  # HMC idle power
    
    def test_startup_power_interpolation_start(self):
        """Test STARTUP state power at start of transition (Requirement 3.2)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.STARTUP
        manager.intervals_in_state = 0
        manager.target_intervals = 4  # Fixed target for testing
        
        power = manager.get_power_level(profile)
        
        # At start (progress=0), power should be close to idle power
        # Note: randomness in operation_power means we can't test exact value
        # but it should be in reasonable range
        assert profile.idle_power_kw <= power <= profile.max_power_kw
    
    def test_startup_power_interpolation_progress(self):
        """Test STARTUP state power increases linearly (Requirement 3.2)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.STARTUP
        manager.target_intervals = 4
        
        # Collect power values at different progress points
        power_values = []
        for interval in range(5):
            manager.intervals_in_state = interval
            power = manager.get_power_level(profile)
            power_values.append(power)
        
        # Power should generally increase (allowing for randomness)
        # At least first value should be less than last
        assert power_values[0] < power_values[-1], "Power should increase during startup"
    
    def test_operation_power_range(self):
        """Test OPERATION state power is 80-100% of max with ±5% variation (Requirement 3.3)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.OPERATION
        
        # Test multiple times due to randomness
        for _ in range(100):
            power = manager.get_power_level(profile)
            
            # Base range: 80-100% of 25kW = 20-25kW
            # With ±5% variation: 20*0.95 to 25*1.05 = 19-26.25kW
            min_power = profile.max_power_kw * 0.8 * 0.95
            max_power = profile.max_power_kw * 1.0 * 1.05
            
            assert min_power <= power <= max_power, \
                f"Operation power {power}kW outside expected range {min_power}-{max_power}kW"
    
    def test_cooldown_power_interpolation_start(self):
        """Test COOLDOWN state power at start of transition (Requirement 3.4)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.COOLDOWN
        manager.intervals_in_state = 0
        manager.target_intervals = 3  # Fixed target for testing
        
        power = manager.get_power_level(profile)
        
        # At start (progress=0), power should be close to operation power (~90% of max)
        expected_start = profile.max_power_kw * 0.9
        # Allow some tolerance
        assert 0.7 * profile.max_power_kw <= power <= profile.max_power_kw
    
    def test_cooldown_power_interpolation_end(self):
        """Test COOLDOWN state power at end of transition (Requirement 3.4)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.COOLDOWN
        manager.intervals_in_state = 3
        manager.target_intervals = 3  # At end (progress=1.0)
        
        power = manager.get_power_level(profile)
        
        # At end (progress=1.0), power should be close to idle power
        assert power == profile.idle_power_kw
    
    def test_cooldown_power_interpolation_progress(self):
        """Test COOLDOWN state power decreases linearly (Requirement 3.4)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.COOLDOWN
        manager.target_intervals = 3
        
        # Collect power values at different progress points
        power_values = []
        for interval in range(4):
            manager.intervals_in_state = interval
            power = manager.get_power_level(profile)
            power_values.append(power)
        
        # Power should decrease from operation to idle
        assert power_values[0] > power_values[-1], "Power should decrease during cooldown"
        # Last value should be idle power
        assert power_values[-1] == profile.idle_power_kw
    
    def test_power_levels_for_different_machine_profiles(self):
        """Test power levels respect different machine profile characteristics"""
        profiles = [MachineProfile.HMC, MachineProfile.VMC, MachineProfile.CNC]
        
        for profile in profiles:
            manager = OperationCycleManager(profile)
            
            # Test IDLE
            manager.state = OperationState.IDLE
            idle_power = manager.get_power_level(profile)
            assert idle_power == profile.idle_power_kw
            
            # Test OPERATION
            manager.state = OperationState.OPERATION
            operation_power = manager.get_power_level(profile)
            assert operation_power <= profile.max_power_kw * 1.05  # Allow variation


class TestCycleAdvancement:
    """Test suite for advance_cycle method"""
    
    def test_advance_increments_intervals_in_state(self):
        """Test that advance_cycle increments intervals_in_state (Requirement 3.5)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.OPERATION
        manager.intervals_in_state = 5
        manager.target_intervals = 20
        
        manager.advance_cycle()
        
        assert manager.intervals_in_state == 6
    
    def test_advance_triggers_transition_at_target(self):
        """Test that reaching target_intervals triggers state transition (Requirement 3.5)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.IDLE
        manager.intervals_in_state = 9
        manager.target_intervals = 10
        
        # Advance to reach target
        manager.advance_cycle()
        
        # Should transition to STARTUP and reset counters
        assert manager.state == OperationState.STARTUP
        assert manager.intervals_in_state == 0
    
    def test_advance_resets_intervals_after_transition(self):
        """Test that intervals_in_state resets to 0 after transition (Requirement 3.5)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.STARTUP
        manager.intervals_in_state = 4
        manager.target_intervals = 5
        
        manager.advance_cycle()
        
        assert manager.intervals_in_state == 0
    
    def test_advance_generates_new_target_after_transition(self):
        """Test that new target_intervals is generated after transition (Requirement 3.5)"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        manager.state = OperationState.OPERATION
        manager.intervals_in_state = 29
        manager.target_intervals = 30
        
        manager.advance_cycle()
        
        # Should transition to COOLDOWN with new target (2-4 for cooldown)
        assert manager.state == OperationState.COOLDOWN
        assert 2 <= manager.target_intervals <= 4
    
    def test_advance_does_not_transition_before_target(self):
        """Test that state doesn't change before reaching target_intervals"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        initial_state = OperationState.OPERATION
        manager.state = initial_state
        manager.intervals_in_state = 5
        manager.target_intervals = 20
        
        manager.advance_cycle()
        
        # Should still be in same state
        assert manager.state == initial_state
        assert manager.intervals_in_state == 6
    
    def test_multiple_advances_through_complete_cycle(self):
        """Test multiple advances through a complete operation cycle"""
        profile = MachineProfile.HMC
        manager = OperationCycleManager(profile)
        
        # Force short durations for testing
        manager.state = OperationState.IDLE
        manager.intervals_in_state = 0
        manager.target_intervals = 2
        
        # Advance through IDLE
        manager.advance_cycle()
        assert manager.state == OperationState.IDLE
        manager.advance_cycle()
        assert manager.state == OperationState.STARTUP
        assert manager.intervals_in_state == 0
        
        # Set short STARTUP duration
        manager.target_intervals = 2
        manager.advance_cycle()
        manager.advance_cycle()
        assert manager.state == OperationState.OPERATION
        
        # Set short OPERATION duration
        manager.target_intervals = 2
        manager.advance_cycle()
        manager.advance_cycle()
        assert manager.state == OperationState.COOLDOWN
        
        # Set short COOLDOWN duration
        manager.target_intervals = 2
        manager.advance_cycle()
        manager.advance_cycle()
        assert manager.state == OperationState.IDLE


class TestOperationCycleIntegration:
    """Integration tests for complete operation cycle behavior"""
    
    def test_realistic_operation_cycle_simulation(self):
        """Test a realistic operation cycle over multiple intervals"""
        profile = MachineProfile.VMC
        manager = OperationCycleManager(profile)
        
        # Track states over 100 intervals
        state_history = []
        power_history = []
        
        for _ in range(100):
            state_history.append(manager.state)
            power = manager.get_power_level(profile)
            power_history.append(power)
            manager.advance_cycle()
        
        # Verify we experienced multiple states
        unique_states = set(state_history)
        assert len(unique_states) >= 2, "Should experience multiple states over 100 intervals"
        
        # Verify power values are always valid
        for power in power_history:
            assert 0 < power <= profile.max_power_kw * 1.1, \
                f"Power {power}kW outside valid range for VMC"
    
    def test_independent_timing_for_multiple_machines(self):
        """Test that multiple machines have independent operation cycles (Requirement 3.7)"""
        profile = MachineProfile.HMC
        
        # Create three managers
        manager1 = OperationCycleManager(profile)
        manager2 = OperationCycleManager(profile)
        manager3 = OperationCycleManager(profile)
        
        # Advance all for same number of intervals
        for _ in range(50):
            manager1.advance_cycle()
            manager2.advance_cycle()
            manager3.advance_cycle()
        
        # Due to random target intervals, they should likely be in different states
        # or at different progress points
        states = [manager1.state, manager2.state, manager3.state]
        intervals = [manager1.intervals_in_state, manager2.intervals_in_state, manager3.intervals_in_state]
        
        # At least some variation should exist (very high probability with random targets)
        # We allow possibility all could be in same state, but intervals should differ
        assert len(set(states)) > 1 or len(set(intervals)) > 1, \
            "Multiple machines should have independent timing"
    
    def test_power_transition_smoothness(self):
        """Test that power transitions are smooth during STARTUP and COOLDOWN"""
        profile = MachineProfile.CNC
        manager = OperationCycleManager(profile)
        
        # Test STARTUP transition
        manager.state = OperationState.STARTUP
        manager.target_intervals = 4
        
        startup_powers = []
        for i in range(5):
            manager.intervals_in_state = i
            power = manager.get_power_level(profile)
            startup_powers.append(power)
        
        # Verify general upward trend (allowing for some randomness)
        assert startup_powers[0] < startup_powers[-1], "Power should increase during startup"
        
        # Test COOLDOWN transition
        manager.state = OperationState.COOLDOWN
        manager.target_intervals = 3
        
        cooldown_powers = []
        for i in range(4):
            manager.intervals_in_state = i
            power = manager.get_power_level(profile)
            cooldown_powers.append(power)
        
        # Verify downward trend
        assert cooldown_powers[0] > cooldown_powers[-1], "Power should decrease during cooldown"
        # Final should be idle
        assert cooldown_powers[-1] == profile.idle_power_kw


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
