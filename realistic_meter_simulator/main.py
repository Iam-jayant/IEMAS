"""
Main Entry Point for Realistic Meter Simulator

This module provides the main entry point and orchestration logic for
running the simulator with three concurrent machine simulators.
"""

import asyncio
import logging
import signal
import sys
from datetime import datetime

from .config import ConfigurationManager
from .models import SimulatorState, MachineProfile
from .http_client import HTTPClient
from .simulator import MachineSimulator


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%dT%H:%M:%SZ'
)

logger = logging.getLogger(__name__)


def setup_signal_handlers(state: SimulatorState):
    """
    Configure signal handlers for graceful shutdown.
    
    Args:
        state: SimulatorState to control running flag
    """
    def signal_handler(signum, frame):
        sig_name = signal.Signals(signum).name
        logger.info(f"Shutdown signal received ({sig_name}), stopping simulator...")
        state.running = False
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)


async def main():
    """
    Main entry point for the simulator.
    
    Initializes configuration, sets up signal handlers, and runs
    all three machine simulators concurrently.
    """
    logger.info("=" * 60)
    logger.info("Realistic Meter Simulator Starting")
    logger.info("=" * 60)
    
    # Load configuration
    try:
        config = ConfigurationManager.load()
        logger.info(f"Backend API URL: {config.api_url}")
        logger.info(f"Transmission Interval: {config.interval_seconds} seconds")
        logger.info(f"Alert Probability: {config.alert_probability:.1%}")
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)
    
    # Create simulator state
    state = SimulatorState()
    
    # Setup signal handlers for graceful shutdown
    setup_signal_handlers(state)
    
    # Initialize HTTP Client
    http_client = HTTPClient(config.api_url)
    await http_client.init_session()
    state.http_client = http_client
    
    # Create Machine Simulators
    machines = [
        MachineSimulator(MachineProfile.HMC.meter_id, MachineProfile.HMC, config, http_client, state),
        MachineSimulator(MachineProfile.VMC.meter_id, MachineProfile.VMC, config, http_client, state),
        MachineSimulator(MachineProfile.CNC.meter_id, MachineProfile.CNC, config, http_client, state),
    ]
    state.machines = machines
    
    logger.info("Simulator initialized successfully")
    logger.info("=" * 60)
    
    try:
        # Run all machines concurrently
        await asyncio.gather(*(machine.run() for machine in machines))
    finally:
        logger.info("Simulator shutting down. Final statistics:")
        for m in machines:
            logger.info(f"[{m.meter_id}] Final cumulative energy: {m.cumulative_energy_kwh:.2f} kWh")
        
        await http_client.close_session()


def run():
    """
    Synchronous wrapper to run the async main function.
    
    This function is the entry point when running the simulator as a script.
    """
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Simulator stopped by user")
    except Exception as e:
        logger.error(f"Simulator crashed with error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    run()
