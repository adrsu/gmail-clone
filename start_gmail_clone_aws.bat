@echo off
echo ===================================
echo    27send with AWS SES
echo ===================================
echo.

echo Checking AWS SES configuration...
cd backend
python test_aws_ses_integration.py

echo.
echo Starting 27send services...
echo.

echo Starting integrated server (includes email server + AWS SES)...
start "27send Server" cmd /k "python run_integrated_server.py"

echo.
echo Services starting...
echo - Auth Service: http://localhost:8000
echo - Email Service (AWS SES): http://localhost:8001  
echo - Mailbox Service: http://localhost:8002
echo - SMTP Server: localhost:2525
echo - IMAP Server: localhost:1143
echo.

echo AWS SES Status: http://localhost:8001/aws-ses/status
echo.

echo Starting frontend...
cd ..\frontend
start "27send Frontend" cmd /k "npm start"

echo.
echo 27send with AWS SES is starting...
echo Frontend will be available at: http://localhost:3000
echo.
pause
