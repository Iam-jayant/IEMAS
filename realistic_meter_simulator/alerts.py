import random
from typing import Optional
from .models import MachineProfile

class ThresholdAlertGenerator:
    """
    Generates realistic threshold alerts for machine profiles based on configured probabilities.
    """
    def __init__(self, alert_probability: float):
        """
        Initialize the alert generator.
        
        Args:
            alert_probability: Float between 0.0 and 1.0 indicating chance of generating an alert.
        """
        self.alert_probability = alert_probability

    def should_generate_alert(self) -> bool:
        """
        Determine if an alert should be generated based on configured probability.
        
        Returns:
            True if an alert should be generated, False otherwise.
        """
        return random.random() < self.alert_probability

    def apply_high_power_alert(self, profile: MachineProfile, current_power: float) -> float:
        """
        Apply a high power alert (110-120% of max power).
        
        Args:
            profile: The machine profile.
            current_power: The current base active power.
            
        Returns:
            The altered active power representing an alert condition.
        """
        # 110-120% of max power
        multiplier = random.uniform(1.10, 1.20)
        return profile.max_power_kw * multiplier

    def apply_low_power_factor_alert(self, current_pf: float) -> float:
        """
        Apply a low power factor alert (0.70-0.84).
        
        Args:
            current_pf: The current power factor.
            
        Returns:
            The altered power factor representing an alert condition.
        """
        return random.uniform(0.70, 0.84)
