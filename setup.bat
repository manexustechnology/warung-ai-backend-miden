@echo off
REM WarungChain Backend Setup Script for Windows
REM This script automates the setup process for the backend

echo 🚀 Starting WarungChain Backend Setup...

REM Check if Node.js is installed
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

for /f "tokens=2 delims=." %%i in ('node --version') do set NODE_VERSION=%%i
if %NODE_VERSION% LSS 18 (
    echo [ERROR] Node.js version 18+ is required. Current version: 
    node --version
    pause
    exit /b 1
)

echo [SUCCESS] Node.js is installed
node --version

REM Check if npm is installed
echo [INFO] Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo [SUCCESS] npm is installed
npm --version

REM Install dependencies
echo [INFO] Installing npm dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed successfully

REM Setup environment file
echo [INFO] Setting up environment configuration...
if not exist .env (
    if exist env.example (
        copy env.example .env >nul
        echo [SUCCESS] Environment file created from example
    ) else (
        echo [ERROR] env.example file not found
        pause
        exit /b 1
    )
) else (
    echo [WARNING] .env file already exists. Skipping...
)

echo [WARNING] Please edit .env file with your database configuration and other settings

REM Setup database
echo [INFO] Setting up database...
if exist database-setup.sql (
    echo [WARNING] Database setup script found. Please run it manually:
    echo psql -U postgres -f database-setup.sql
)

REM Generate Prisma client
echo [INFO] Generating Prisma client...
npm run db:generate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate Prisma client
    pause
    exit /b 1
)

REM Push schema to database
echo [INFO] Pushing database schema...
npm run db:push
if %errorlevel% neq 0 (
    echo [ERROR] Failed to push database schema
    pause
    exit /b 1
)

echo [SUCCESS] Database setup completed

REM Seed database
echo [INFO] Seeding database with sample data...
set /p SEED_DB="Do you want to seed the database with sample data? (y/N): "
if /i "%SEED_DB%"=="y" (
    npm run db:seed
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to seed database
        pause
        exit /b 1
    )
    echo [SUCCESS] Database seeded successfully
) else (
    echo [WARNING] Database seeding skipped
)

REM Create uploads directory
echo [INFO] Creating uploads directory...
if not exist uploads mkdir uploads
echo [SUCCESS] Uploads directory created

echo.
echo ==========================================
echo   Setup completed successfully!
echo ==========================================
echo.
echo Next steps:
echo 1. Edit .env file with your configuration
echo 2. Start the development server: npm run dev
echo 3. Access the API at: http://localhost:3001
echo 4. Check health endpoint: http://localhost:3001/health
echo.
echo Documentation: README.md
echo API Documentation: Available at /api endpoints
echo.

REM Ask if user wants to test the setup
set /p TEST_SETUP="Do you want to test the setup now? (y/N): "
if /i "%TEST_SETUP%"=="y" (
    echo [INFO] Testing the setup...
    echo [INFO] Testing server startup...
    
    REM Start server in background
    start /b npm start
    
    REM Wait for server to start
    timeout /t 5 /nobreak >nul
    
    REM Test health endpoint
    curl -s http://localhost:3001/health >nul 2>&1
    if %errorlevel% equ 0 (
        echo [SUCCESS] Server is running correctly
    ) else (
        echo [WARNING] Server test failed. You may need to check your configuration
    )
    
    REM Stop server
    taskkill /f /im node.exe >nul 2>&1
)

echo.
echo [SUCCESS] Setup script completed!
pause 