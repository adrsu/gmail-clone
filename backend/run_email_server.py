#!/usr/bin/env python3
"""
Email Server Startup Script
Runs the SMTP/IMAP server for the Gmail clone application
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set environment variables for development
os.environ.setdefault('DEVELOPMENT_MODE', 'true')
os.environ.setdefault('IMAP_HOST', '0.0.0.0')
os.environ.setdefault('IMAP_PORT', '1143')
os.environ.setdefault('SMTP_RECEIVE_HOST', '0.0.0.0')
os.environ.setdefault('SMTP_RECEIVE_PORT', '2525')

async def main():
    """Main entry point"""
    try:
        from email_server.main import main as email_server_main
        await email_server_main()
    except ImportError as e:
        print(f"Import error: {e}")
        print("Make sure you're running this from the backend directory")
        sys.exit(1)
    except Exception as e:
        print(f"Error starting email server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Starting Gmail Clone Email Server...")
    print("Press Ctrl+C to stop")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down email server...")
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)
