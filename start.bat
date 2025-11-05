@echo off
echo Starting Fill The Shelf Application...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo Docker is running
echo.

REM Build and start the containers
echo Building and starting containers...
docker-compose up --build -d

if %errorlevel% == 0 (
    echo.
    echo Application started successfully!
    echo.
    echo Access the application at: http://localhost:3000
    echo.
    echo Sample QR codes to test:
    echo    - product-01
    echo    - product-02
    echo    - product-03
    echo.
    echo To stop the application, run: docker-compose down
    echo.
    echo To view logs, run: docker-compose logs -f
) else (
    echo.
    echo Failed to start the application
    pause
    exit /b 1
)

pause
