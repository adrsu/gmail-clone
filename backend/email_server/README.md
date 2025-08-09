# Email Server - SMTP/IMAP Implementation

This module implements a complete SMTP/IMAP server for the Gmail clone application, allowing it to send and receive emails using standard email protocols.

## Features

### SMTP Server (Receiving)
- **Port**: 25 (default) or 465 (SSL)
- **Protocol**: SMTP for receiving incoming emails
- **Authentication**: Optional (disabled in development mode)
- **Email Processing**: Parses and stores incoming emails in the database
- **Multi-recipient Support**: Handles emails with multiple recipients

### IMAP Server (Access)
- **Port**: 143 (default) or 993 (SSL)
- **Protocol**: IMAP4rev1 for email client access
- **Authentication**: Username/password (simplified in development mode)
- **Mailbox Support**: INBOX, Sent, Drafts, Trash, Spam
- **Commands**: SELECT, LIST, FETCH, SEARCH, STORE, EXPUNGE

## Configuration

### Environment Variables

```bash
# Development Mode
DEVELOPMENT_MODE=true

# IMAP Server
IMAP_HOST=0.0.0.0
IMAP_PORT=143
IMAP_USE_SSL=false
IMAP_SSL_PORT=993

# SMTP Receive Server
SMTP_RECEIVE_HOST=0.0.0.0
SMTP_RECEIVE_PORT=25
SMTP_RECEIVE_USE_SSL=false
SMTP_RECEIVE_SSL_PORT=465
```

### Development vs Production

**Development Mode (`DEVELOPMENT_MODE=true`)**:
- Accepts any authentication credentials
- Logs email operations instead of sending externally
- Uses local database for email storage
- Simplified security for testing

**Production Mode (`DEVELOPMENT_MODE=false`)**:
- Requires proper authentication
- Integrates with external SMTP servers for sending
- Enhanced security measures
- Production-grade email handling

## Usage

### Starting the Email Server

```bash
# From the backend directory
cd backend

# Activate virtual environment (if using one)
# Windows:
venv\Scripts\activate
# Unix/Mac:
source venv/bin/activate

# Start the email server
python run_email_server.py
```

### Testing the Email Server

```bash
# Run the test suite
python test_email_server.py
```

### Integration with Email Service

The email server integrates with the existing email service:

1. **Sending Emails**: The existing `SMTPHandler` now tries to use the local SMTP server first in development mode
2. **Receiving Emails**: Incoming emails are automatically stored in the database
3. **Email Access**: The IMAP server provides access to stored emails

## Architecture

### Components

1. **IMAP Server** (`imap_server.py`)
   - Handles IMAP protocol commands
   - Manages client connections and authentication
   - Provides access to email mailboxes

2. **SMTP Receive Server** (`smtp_receive_server.py`)
   - Accepts incoming SMTP connections
   - Processes and stores received emails
   - Handles email parsing and database storage

3. **Server Manager** (`main.py`)
   - Coordinates both servers
   - Handles graceful shutdown
   - Manages server lifecycle

4. **Models** (`models.py`)
   - Data structures for IMAP/SMTP operations
   - Connection and command models

### Data Flow

```
External Email Client
        ↓
   SMTP Server (Port 25)
        ↓
   Email Parser
        ↓
   Database Storage
        ↓
   IMAP Server (Port 143)
        ↓
   Email Client Access
```

## Email Client Configuration

### Thunderbird Configuration

**IMAP Settings**:
- Server: `localhost`
- Port: `143` (or `993` for SSL)
- Username: `your_username`
- Password: `your_password` (any password in development mode)
- Security: `None` (or `SSL/TLS` for SSL)

**SMTP Settings**:
- Server: `localhost`
- Port: `25` (or `465` for SSL)
- Username: `your_username`
- Password: `your_password`
- Security: `None` (or `SSL/TLS` for SSL)

### Outlook Configuration

**IMAP Settings**:
- Incoming mail server: `localhost`
- Port: `143`
- Encryption: `None`
- Authentication: `Password`

**SMTP Settings**:
- Outgoing mail server: `localhost`
- Port: `25`
- Encryption: `None`
- Authentication: `Password`

## Security Considerations

### Development Mode
- Accepts any authentication credentials
- No SSL/TLS enforcement
- Simplified security for testing

### Production Mode
- Implement proper authentication
- Enable SSL/TLS
- Add rate limiting
- Implement spam filtering
- Add logging and monitoring

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check if ports are in use
   netstat -an | grep :25
   netstat -an | grep :143
   
   # Kill processes using the ports
   sudo lsof -ti:25 | xargs kill -9
   sudo lsof -ti:143 | xargs kill -9
   ```

2. **Permission Denied**
   ```bash
   # Run with elevated privileges (Linux/Mac)
   sudo python run_email_server.py
   ```

3. **Database Connection Issues**
   - Ensure Supabase is properly configured
   - Check environment variables
   - Verify database schema

### Logs

The server provides detailed logging:
- Connection events
- Email processing
- Authentication attempts
- Error messages

## Future Enhancements

1. **Advanced IMAP Features**
   - IDLE support for real-time updates
   - Quota management
   - Advanced search capabilities

2. **Security Improvements**
   - OAuth2 authentication
   - Certificate management
   - Rate limiting
   - Spam filtering

3. **Performance Optimizations**
   - Connection pooling
   - Caching
   - Async email processing

4. **Monitoring and Analytics**
   - Server metrics
   - Email statistics
   - Performance monitoring
