"""
Configuration Manager for Realistic Meter Simulator

This module handles loading and validation of simulator configuration from
JSON files or default values.
"""

import json
import logging
from pathlib import Path
from typing import Optional

from .models import SimulatorConfig

logger = logging.getLogger(__name__)


class ConfigurationManager:
    """
    Manages loading and validation of simulator configuration.
    
    Configuration can be loaded from a JSON file or use built-in defaults.
    If the configuration file is missing or invalid, defaults are used.
    """
    
    DEFAULT_CONFIG_FILE = "simulator_config.json"
    
    @classmethod
    def load(cls, filepath: Optional[str] = None) -> SimulatorConfig:
        """
        Load configuration from JSON file or use defaults.
        
        Args:
            filepath: Path to configuration file (default: simulator_config.json)
            
        Returns:
            SimulatorConfig: Loaded or default configuration
            
        The method gracefully handles missing or invalid configuration files
        by falling back to default values.
        """
        if filepath is None:
            filepath = cls.DEFAULT_CONFIG_FILE
        
        config_path = Path(filepath)
        
        # Try to load from file
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    config_data = json.load(f)
                
                logger.info(f"Configuration loaded from {filepath}")
                
                # Create config with loaded values, using defaults for missing keys
                config = SimulatorConfig(
                    api_url=config_data.get('api_url', SimulatorConfig.api_url),
                    interval_seconds=config_data.get('interval_seconds', SimulatorConfig.interval_seconds),
                    alert_probability=config_data.get('alert_probability', SimulatorConfig.alert_probability)
                )
                
                # Validate configuration
                config.validate()
                
                return config
                
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in configuration file: {e}")
                logger.info("Using default configuration")
                return SimulatorConfig()
                
            except ValueError as e:
                logger.error(f"Configuration validation failed: {e}")
                raise  # Re-raise validation errors as they indicate invalid config
                
        else:
            logger.info(f"Configuration file not found at {filepath}, using defaults")
            return SimulatorConfig()
    
    @classmethod
    def save(cls, config: SimulatorConfig, filepath: Optional[str] = None) -> None:
        """
        Save configuration to JSON file.
        
        Args:
            config: SimulatorConfig to save
            filepath: Path to configuration file (default: simulator_config.json)
        """
        if filepath is None:
            filepath = cls.DEFAULT_CONFIG_FILE
        
        config_path = Path(filepath)
        
        config_data = {
            'api_url': config.api_url,
            'interval_seconds': config.interval_seconds,
            'alert_probability': config.alert_probability
        }
        
        with open(config_path, 'w') as f:
            json.dump(config_data, f, indent=2)
        
        logger.info(f"Configuration saved to {filepath}")
