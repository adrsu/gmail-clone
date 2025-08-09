#!/usr/bin/env python3
"""
Integrated Server Startup Script
Starts both the email server and the main application services
"""

import asyncio
import subprocess
import sys
import time
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from shared.config import settings

def start_email_server():
    """Start the email server in a separate process"""
    print("🚀 Starting Email Server...")
    try:
        # Start email server in background
        process = subprocess.Popen([
            sys.executable, "run_email_server.py"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait a moment for the server to start
        time.sleep(3)
        
        if process.poll() is None:
            print("✅ Email Server started successfully")
            return process
        else:
            print("❌ Email Server failed to start")
            return None
    except Exception as e:
        print(f"❌ Error starting Email Server: {e}")
        return None

def start_main_services():
    """Start the main application services"""
    print("🚀 Starting Main Application Services...")
    
    # List of services to start
    services = [
        {
            "name": "Auth Service",
            "command": [sys.executable, "-m", "uvicorn", "auth_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
        },
        {
            "name": "Email Service",
            "command": [sys.executable, "-m", "uvicorn", "email_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
        },
        {
            "name": "Mailbox Service",
            "command": [sys.executable, "-m", "uvicorn", "mailbox_service.main:app", "--host", "0.0.0.0", "--port", "8002"]
        }
    ]
    
    processes = []
    
    for service in services:
        try:
            print(f"Starting {service['name']}...")
            process = subprocess.Popen(
                service['command'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            processes.append((service['name'], process))
            time.sleep(1)  # Small delay between services
        except Exception as e:
            print(f"❌ Error starting {service['name']}: {e}")
    
    return processes

def main():
    """Main startup function"""
    print("🎉 Gmail Clone - Integrated Server Startup")
    print("=" * 50)
    print(f"Development Mode: {settings.development_mode}")
    print(f"Email Server Port: {settings.smtp_receive_port}")
    print(f"IMAP Server Port: {settings.imap_port}")
    print("=" * 50)
    
    # Start email server
    email_server_process = start_email_server()
    if not email_server_process:
        print("❌ Failed to start Email Server. Exiting.")
        return
    
    # Start main services
    service_processes = start_main_services()
    
    print("\n" + "=" * 50)
    print("✅ All Services Started Successfully!")
    print("=" * 50)
    print("📧 Email Server: localhost:2525 (SMTP), localhost:1143 (IMAP)")
    print("🔐 Auth Service: http://localhost:8000")
    print("📨 Email Service: http://localhost:8001")
    print("📁 Mailbox Service: http://localhost:8002")
    print("\n🌐 Frontend: http://localhost:3000")
    print("=" * 50)
    print("Press Ctrl+C to stop all services")
    
    try:
        # Keep the main process running
        while True:
            time.sleep(1)
            
            # Check if email server is still running
            if email_server_process.poll() is not None:
                print("❌ Email Server stopped unexpectedly")
                break
            
            # Check if any service stopped
            for service_name, process in service_processes:
                if process.poll() is not None:
                    print(f"❌ {service_name} stopped unexpectedly")
                    break
    
    except KeyboardInterrupt:
        print("\n🛑 Shutting down all services...")
        
        # Stop email server
        if email_server_process:
            email_server_process.terminate()
            print("✅ Email Server stopped")
        
        # Stop all services
        for service_name, process in service_processes:
            process.terminate()
            print(f"✅ {service_name} stopped")
        
        print("🎉 All services stopped successfully")

if __name__ == "__main__":
    main()
