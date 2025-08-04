from supabase import create_client, Client
from shared.config import settings
import os

# Initialize Supabase client
def get_supabase():
    # Check if Supabase credentials are properly configured
    if (settings.SUPABASE_URL == "your-supabase-url" or 
        settings.SUPABASE_KEY == "your-supabase-anon-key"):
        raise Exception("Please configure Supabase credentials in your .env file")
    
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY) 