# Gmail Clone - Comprehensive Mailing Service

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Development Phases](#development-phases)
4. [Technology Stack](#technology-stack)
5. [Setup Instructions](#setup-instructions)
6. [API Documentation](#api-documentation)
7. [Deployment Guide](#deployment-guide)

## Project Overview

This is a comprehensive mailing service application built with modern technologies, featuring:

- **Frontend**: React.js + TypeScript
- **Backend**: Microservices architecture with Python
- **Backend-as-a-Service**: Supabase
- **Email Protocols**: SMTP/IMAP servers
- **Search**: Elasticsearch
- **Storage**: AWS S3
- **Message Queue**: RabbitMQ
- **Security**: JWT, OAuth, encryption

## System Architecture

### Core Components

1. **Frontend Layer** - React.js + TypeScript
2. **Backend Services** - Microservices (Auth, User, Email, Mailbox)
3. **Email Protocol Handlers** - SMTP/IMAP servers
4. **Backend-as-a-Service** - Supabase (Database, Auth, Real-time)
5. **Storage Systems** - AWS S3 + Caching
6. **Security & Authentication** - JWT + OAuth + Supabase RLS
7. **Infrastructure & Scalability** - Traditional hosting + Supabase
8. **Additional Features** - Search, Notifications, Analytics

## Development Phases

### Phase 1: Foundation Setup
- [x] Project structure and configuration
- [x] Supabase setup and database schema
- [x] Basic authentication system with Supabase Auth
- [x] Frontend setup with React + TypeScript

### Phase 2: Core Email Services
- [x] Email sending/receiving functionality
- [x] SMTP/IMAP server implementation
- [x] Email storage and retrieval with Supabase
- [x] Basic frontend email interface
- [x] Email Server Integration

### Phase 3: Advanced Features
- [x] Search functionality with Elasticsearch
- [ ] Real-time notifications with Supabase Realtime
- [ ] File attachment handling
- [ ] Email threading and organization

### Phase 4: Security & Optimization
- [ ] Security implementations with Supabase RLS
- [ ] Performance optimization
- [ ] Caching strategies
- [ ] Monitoring and logging

### Phase 5: Deployment & Scaling
- [ ] Traditional hosting deployment
- [ ] Supabase production setup
- [ ] CI/CD pipeline
- [ ] Production monitoring

## Technology Stack

### Frontend
- React.js 18+
- TypeScript
- Material-UI or Tailwind CSS
- Redux Toolkit or Zustand
- React Query for data fetching
- @supabase/supabase-js

### Backend
- Python 3.11+
- FastAPI for REST APIs
- Celery for background tasks
- Pydantic for data validation
- Supabase Python client
- **Email Server**: Custom SMTP/IMAP implementation

### Backend-as-a-Service
- Supabase (PostgreSQL database, Auth, Real-time, Storage)
- Row Level Security (RLS)
- Built-in authentication
- Real-time subscriptions

### Infrastructure
- AWS S3 (file storage)
- Elasticsearch (search)
- RabbitMQ (message queue)

### Security
- JWT tokens
- OAuth 2.0
- TLS/SSL encryption
- Rate limiting
- Input validation
- Supabase Row Level Security

## 🎉 Email Server Integration

### **Fully Integrated Email Server**

The Gmail clone now includes a **complete SMTP/IMAP email server** that provides:

- **SMTP Server** (Port 2525): Receives incoming emails
- **IMAP Server** (Port 1143): Provides email access and management
- **Database Integration**: Stores emails in Supabase
- **Real Email Processing**: Parses and stores actual email messages
- **Mailbox Management**: Supports standard email folders (INBOX, Sent, Drafts, etc.)

### Email Server Features

✅ **SMTP Functionality**:
- Receives emails from external sources
- Processes email headers and content
- Stores emails in database with proper metadata
- Supports multiple recipients (TO, CC, BCC)

✅ **IMAP Functionality**:
- Email authentication and login
- Mailbox listing and management
- Email retrieval and viewing
- Standard IMAP protocol compliance

✅ **Integration**:
- Seamlessly integrated with existing email service
- Works with the web interface
- Supports real email composition and sending
- Database storage with user association

### Quick Start with Email Server

1. **Start the Integrated Server**:
   ```bash
   # Windows
   start_gmail_clone.bat
   
   # Linux/Mac
   ./start_gmail_clone.sh
   
   # Or manually
   cd backend
   python run_integrated_server.py
   ```

2. **Test the Integration**:
   ```bash
   cd backend
   python test_integration.py
   ```

3. **Access the Application**:
   - Frontend: http://localhost:3000
   - Auth Service: http://localhost:8000
   - Email Service: http://localhost:8001
   - Mailbox Service: http://localhost:8002
   - SMTP Server: localhost:2525
   - IMAP Server: localhost:1143

## Quick Start

1. Clone the repository
2. Install dependencies
3. Set up Supabase project
4. Configure environment variables
5. Start the development servers

```bash
# Clone and setup
git clone <repository-url>
cd gmail-clone

# Install dependencies
npm install  # Frontend
pip install -r requirements.txt  # Backend

# Set up Supabase
# 1. Create Supabase project at https://supabase.com
# 2. Get your project URL and API keys
# 3. Run the SQL scripts in docs/phase1-foundation-setup.md

# Start the integrated server (includes email server)
cd backend
python run_integrated_server.py

# Or start frontend separately
npm start  # Frontend
```

## Project Structure

```
gmail-clone/
├── frontend/                 # React.js frontend
├── backend/                  # Python microservices
│   ├── auth_service/        # Authentication service
│   ├── email_service/       # Email core service
│   ├── email_server/        # SMTP/IMAP server implementation
│   ├── mailbox_service/     # Mailbox management
│   └── shared/              # Shared utilities
├── docs/                    # Documentation
└── scripts/                 # Setup and deployment scripts
```

## Email Server Features

The application includes a complete SMTP/IMAP server implementation:

### SMTP Server (Receiving)
- **Port**: 25 (default) or 465 (SSL)
- **Purpose**: Receives incoming emails
- **Features**: Email parsing, database storage, multi-recipient support

### IMAP Server (Access)
- **Port**: 143 (default) or 993 (SSL)
- **Purpose**: Provides email client access
- **Features**: Mailbox support, authentication, standard IMAP commands

### Development Mode
- Accepts any authentication credentials
- Logs email operations
- Simplified security for testing

### Production Mode
- Proper authentication required
- SSL/TLS encryption
- Production-grade security

For detailed configuration and usage, see `backend/email_server/README.md`.

## Elasticsearch Search Implementation

The application now uses Elasticsearch for advanced search functionality, replacing the basic Supabase `ilike` search with full-text search capabilities.

### Quick Setup

1. **Start Elasticsearch (Docker):**
   ```bash
   docker-compose -f docker-compose.elasticsearch.yml up -d
   ```

2. **Add to your `.env` file:**
   ```env
   ELASTICSEARCH_URL=http://localhost:9200
   ```

3. **Initialize Elasticsearch:**
   ```bash
   cd backend
   python init_elasticsearch.py
   ```

4. **Reindex existing emails (optional):**
   ```bash
   python init_elasticsearch.py --reindex
   ```

### Features

- **Full-text search** across email subjects, bodies, and sender/recipient names
- **Fuzzy matching** for typos and partial matches
- **Relevance scoring** with subject field weighted higher
- **Folder-specific filtering** (inbox, sent, drafts, etc.)
- **Fallback to Supabase** if Elasticsearch is unavailable
- **Real-time indexing** of new, updated, and deleted emails

### Monitoring

- **Kibana**: http://localhost:5601 (for search analytics)
- **Elasticsearch API**: `curl http://localhost:9200/emails/_search`

---