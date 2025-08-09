import asyncio
import signal
import sys
from typing import List
import logging

from .imap_server import IMAPServer
from .smtp_receive_server import SMTPReceiveServer
from shared.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class EmailServerManager:
    def __init__(self):
        self.imap_server = IMAPServer()
        self.smtp_receive_server = SMTPReceiveServer()
        self.tasks: List[asyncio.Task] = []
        self.running = False
        
    async def start_servers(self):
        """Start both SMTP and IMAP servers"""
        logger.info("Starting Email Server Manager...")
        
        try:
            # Start IMAP server
            imap_task = asyncio.create_task(self.imap_server.start_server())
            self.tasks.append(imap_task)
            logger.info("IMAP server task created")
            
            # Start SMTP receive server
            smtp_task = asyncio.create_task(self.smtp_receive_server.start_server())
            self.tasks.append(smtp_task)
            logger.info("SMTP receive server task created")
            
            self.running = True
            
            # Wait for all tasks to complete
            await asyncio.gather(*self.tasks)
            
        except Exception as e:
            logger.error(f"Error starting servers: {e}")
            await self.stop_servers()
    
    async def stop_servers(self):
        """Stop all servers gracefully"""
        logger.info("Stopping Email Server Manager...")
        self.running = False
        
        # Cancel all tasks
        for task in self.tasks:
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        self.tasks.clear()
        logger.info("All servers stopped")


async def main():
    """Main entry point"""
    server_manager = EmailServerManager()
    
    # Handle shutdown signals
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}, shutting down...")
        asyncio.create_task(server_manager.stop_servers())
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        await server_manager.start_servers()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        await server_manager.stop_servers()


if __name__ == "__main__":
    print("Starting Gmail Clone Email Server...")
    print(f"Development Mode: {settings.development_mode}")
    print(f"IMAP Server: {settings.imap_host}:{settings.imap_port}")
    print(f"SMTP Receive Server: {settings.smtp_receive_host}:{settings.smtp_receive_port}")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down...")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
