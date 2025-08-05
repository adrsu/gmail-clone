from supabase import create_client, Client
from shared.config import settings
import os

# Initialize Supabase client
def get_supabase():
    # Check if Supabase credentials are properly configured
    if (settings.SUPABASE_URL == "your-supabase-url" or 
        settings.SUPABASE_KEY == "your-supabase-anon-key"):
        raise Exception("Please configure Supabase credentials in your .env file")
    
    # Use service role key for backend operations to bypass RLS
    service_key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
    return create_client(settings.SUPABASE_URL, service_key) 