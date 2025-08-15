#!/usr/bin/env python3
"""
Test script to check the API endpoint directly
"""

import asyncio
import requests
import json

def test_api_endpoint():
    """Test the API endpoint directly"""
    print("🧪 Testing API Endpoint")
    print("=" * 50)
    
    # Test the emails endpoint
    base_url = "http://localhost:8000"  # Adjust if your backend runs on a different port
    user_id = "test-user-id"  # Use a valid user ID from your database
    
    try:
        # Test getting emails
        response = requests.get(f"{base_url}/emails?user_id={user_id}&folder=inbox")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API call successful")
            print(f"   - Total emails: {data.get('total', 0)}")
            print(f"   - Emails returned: {len(data.get('emails', []))}")
            
            # Check if any emails have attachments
            emails_with_attachments = []
            for email in data.get('emails', []):
                if email.get('attachments') and len(email['attachments']) > 0:
                    emails_with_attachments.append(email)
            
            print(f"   - Emails with attachments: {len(emails_with_attachments)}")
            
            if emails_with_attachments:
                print("\n📎 Emails with attachments:")
                for i, email in enumerate(emails_with_attachments):
                    print(f"   {i+1}. Subject: {email.get('subject', 'No subject')}")
                    print(f"      Attachments: {len(email.get('attachments', []))}")
                    for j, att in enumerate(email.get('attachments', [])):
                        print(f"        - {j+1}. {att.get('filename', 'Unknown')}")
                        print(f"          ID: {att.get('id', 'Unknown')}")
                        print(f"          URL: {att.get('url', 'No URL')}")
                        print(f"          Size: {att.get('size', 'Unknown')} bytes")
            else:
                print("   - No emails with attachments found")
        else:
            print(f"❌ API call failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")

if __name__ == "__main__":
    print("🚀 Starting API Endpoint Test")
    print("=" * 60)
    
    test_api_endpoint()
    
    print("\n✨ Test completed!")
