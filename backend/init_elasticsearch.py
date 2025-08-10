#!/usr/bin/env python3
"""
Elasticsearch initialization script for Gmail Clone
This script sets up the Elasticsearch index and optionally reindexes existing emails.
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from shared.elasticsearch_service import elasticsearch_service
from email_service.database import supabase
from email_service.models import EmailMessage
from shared.config import settings

async def init_elasticsearch():
    """Initialize Elasticsearch index"""
    print("🔍 Initializing Elasticsearch...")
    
    try:
        # Create the index
        await elasticsearch_service.create_index()
        print("✅ Elasticsearch index created successfully")
        
        # Test connection
        if elasticsearch_service.client.ping():
            print("✅ Elasticsearch connection successful")
        else:
            print("❌ Elasticsearch connection failed")
            return False
            
    except Exception as e:
        print(f"❌ Error initializing Elasticsearch: {e}")
        return False
    
    return True

async def reindex_existing_emails():
    """Reindex all existing emails from Supabase"""
    print("📧 Reindexing existing emails...")
    
    try:
        # Get all emails from Supabase
        result = supabase.table("emails").select("*").execute()
        
        if not result.data:
            print("ℹ️  No existing emails found to reindex")
            return True
        
        print(f"📥 Found {len(result.data)} emails to reindex")
        
        # Prepare emails for bulk indexing
        emails_to_index = []
        for email_data in result.data:
            # Ensure all required fields are present
            email_data.setdefault("subject", "")
            email_data.setdefault("body", "")
            email_data.setdefault("html_body", "")
            email_data.setdefault("from_address", {})
            email_data.setdefault("to_addresses", [])
            email_data.setdefault("cc_addresses", [])
            email_data.setdefault("bcc_addresses", [])
            email_data.setdefault("is_read", False)
            email_data.setdefault("is_starred", False)
            
            emails_to_index.append(email_data)
        
        # Bulk index the emails
        await elasticsearch_service.bulk_index_emails(emails_to_index)
        print(f"✅ Successfully reindexed {len(emails_to_index)} emails")
        
    except Exception as e:
        print(f"❌ Error reindexing emails: {e}")
        return False
    
    return True

async def main():
    """Main function"""
    print("🚀 Gmail Clone Elasticsearch Initialization")
    print("=" * 50)
    
    # Check if Elasticsearch URL is configured
    if not settings.ELASTICSEARCH_URL:
        print("❌ ELASTICSEARCH_URL not configured in environment")
        print("Please set ELASTICSEARCH_URL in your .env file")
        return
    
    print(f"📍 Elasticsearch URL: {settings.ELASTICSEARCH_URL}")
    
    # Initialize Elasticsearch
    if not await init_elasticsearch():
        print("❌ Failed to initialize Elasticsearch")
        return
    
    # Ask user if they want to reindex existing emails
    if len(sys.argv) > 1 and sys.argv[1] == "--reindex":
        print("\n🔄 Reindexing existing emails...")
        if not await reindex_existing_emails():
            print("❌ Failed to reindex emails")
            return
    else:
        print("\nℹ️  To reindex existing emails, run: python init_elasticsearch.py --reindex")
    
    print("\n✅ Elasticsearch initialization complete!")
    print("🎉 Your Gmail Clone is now ready to use Elasticsearch for search!")

if __name__ == "__main__":
    asyncio.run(main())

