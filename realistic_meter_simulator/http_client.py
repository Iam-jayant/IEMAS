import aiohttp
import asyncio
import json
import logging
from typing import Optional
from .models import MeterReading

logger = logging.getLogger(__name__)

class HTTPClient:
    """
    Handles HTTP communication with the backend API including retry logic.
    """
    def __init__(self, api_url: str):
        """
        Initialize the HTTP client.
        
        Args:
            api_url: The URL to send meter readings to.
        """
        self.api_url = api_url
        self.session: Optional[aiohttp.ClientSession] = None

    async def init_session(self):
        """Initialize the aiohttp ClientSession."""
        if self.session is None:
            self.session = aiohttp.ClientSession()

    async def close_session(self):
        """Close the aiohttp ClientSession gracefully."""
        if self.session:
            await self.session.close()
            self.session = None

    async def send_reading(self, reading: MeterReading) -> bool:
        """
        Send a meter reading with exponential backoff retry logic.
        
        Args:
            reading: The MeterReading to send.
            
        Returns:
            True if transmission was successful, False otherwise.
        """
        if not self.session:
            logger.error("HTTP session not initialized. Call init_session() first.")
            return False

        payload = reading.to_json()
        max_retries = 3
        retry_delays = [1, 2, 4]  # Exponential backoff timing
        
        for attempt in range(max_retries + 1):
            try:
                # 10 second timeout for request
                async with self.session.post(
                    self.api_url, 
                    json=payload, 
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    status = response.status
                    
                    if status == 201:
                        logger.info(f"Successfully transmitted reading for {reading.meter_id} "
                                    f"(Power: {reading.active_power:.2f}kW, Status: 201)")
                        return True
                    elif status == 400:
                        logger.warning(f"Failed to transmit reading for {reading.meter_id} "
                                       f"(Status: 400, Unregistered meter). Not retrying.")
                        return False
                    elif status == 500:
                        logger.error(f"Failed to transmit reading for {reading.meter_id} "
                                     f"(Status: 500, Internal Server Error).")
                        # Fall through to retry
                    else:
                        logger.error(f"Unexpected HTTP status {status} when transmitting "
                                     f"for {reading.meter_id}.")
                        # Fall through to retry

            except aiohttp.ClientError as e:
                logger.error(f"Connection error when transmitting for {reading.meter_id}: {e}")
                # Fall through to retry
            except asyncio.TimeoutError:
                logger.error(f"Timeout when transmitting for {reading.meter_id}.")
                # Fall through to retry
            except Exception as e:
                logger.error(f"Unexpected error when transmitting for {reading.meter_id}: {e}")
                # Fall through to retry

            if attempt < max_retries:
                delay = retry_delays[attempt]
                logger.info(f"Retrying transmission for {reading.meter_id} in {delay} seconds "
                            f"(Attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(delay)

        logger.error(f"Failed to transmit reading for {reading.meter_id} after {max_retries} retries.")
        return False
