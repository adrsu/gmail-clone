@echo off
echo 🎉 Starting 27send Application...
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo Virtual environment not found. Please create one first.
    pause
    exit /b 1
)

REM Start the integrated server
echo Starting integrated server...
cd backend
python run_integrated_server.py

pause
