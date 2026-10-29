@echo off
chcp 65001 >nul
title [ERP YEN VA CA PHE] - Khoi Tao va Kiem Thu He Thong
color 0A

echo ===============================================================================
echo       HE THONG QUAN TRI DOANH NGHIEP YEN SAO VA CA PHE (ERP + AI SYSTEM)
echo                 KHOI DONG VA TEST NHANH CHO THANH VIEN NHOM
echo ===============================================================================
echo.

:: 1. KIEM TRA PYTHON
echo [1/5] Dang kiem tra moi truong Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [LOI] Khong tim thay Python tren he thong!
    echo Vui long cai dat Python 3.10 tro len tai https://www.python.org/
    echo Nho tich chon "Add Python to PATH" khi cai dat.
    pause
    exit /b 1
)
python --version
echo.

:: 2. KIEM TRA NODE.JS VA NPM
echo [2/5] Dang kiem tra moi truong Node.js va npm...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [LOI] Khong tim thay Node.js tren he thong!
    echo Vui long cai dat Node.js LTS tai https://nodejs.org/
    pause
    exit /b 1
)
node -v
echo.

:: 3. KIEM TRA VA CAI DAT DEPENDENCIES
echo [3/5] Dang kiem tra thu vien Backend va Frontend...
python -c "import fastapi, uvicorn, pydantic, requests" >nul 2>nul
if %errorlevel% neq 0 (
    echo   * Dang cai dat thu vien Python can thiet tu requirements.txt...
    pip install -r requirements.txt
) else (
    echo   * Backend Python dependencies: OK!
)

if not exist "frontend\node_modules" (
    echo   * Thu muc frontend\node_modules chua co. Dang tien hanh npm install...
    pushd frontend
    call npm install
    popd
) else (
    echo   * Frontend node_modules: OK!
)
echo.

:: 4. KHOI TAO CO SO DU LIEU MAU
echo [4/5] Dang kiem tra Co so du lieu SQLite (database/enterprise_erp.db)...
python backend/setup_database.py
if %errorlevel% neq 0 (
    color 0C
    echo [LOI] Khong the khoi tao CSDL!
    pause
    exit /b 1
)
echo.

:: 5. KIEM TRA BUILD FRONTEND SPA
if not exist "frontend\dist\index.html" (
    echo   * Dang build frontend SPA sang thu muc frontend/dist...
    pushd frontend
    call npm run build
    popd
) else (
    echo   * Ban build frontend/dist: SAN SANG!
)
echo.

:: 6. CHAY TEST SUITE BACKEND KIEM TRA TINH TOAN VEN
echo ===============================================================================
echo                 DANG CHAY BO TEST KIEM THU TU DONG (28 TESTS)
echo ===============================================================================
python backend/test_backend.py
if %errorlevel% neq 0 (
    color 0E
    echo [CANH BAO] Mot so test co the chua vuot qua. Vui long kiem tra log tren.
) else (
    echo [XAC NHAN] 28/28 Unit Tests Backend vuot qua 100%!
)
echo.

:: 7. KIEM TRA THAM SO DONG LENH (NEU CO)
if "%~1"=="1" goto RUN_UNIFIED
if "%~1"=="2" goto RUN_DEV
if /i "%~1"=="--dev" goto RUN_DEV
if "%~1"=="3" goto RUN_FULL_TESTS
if /i "%~1"=="--test" goto RUN_FULL_TESTS
if "%~1"=="4" goto RESET_DB
if /i "%~1"=="--reset" goto RESET_DB

:: 8. MENU LUA CHON KHOI CHAY
:MENU
color 0B
echo ===============================================================================
echo                             LUA CHON CHE DO CHAY
echo ===============================================================================
echo  [1] Chay Unified Server (Port 8000: Full-stack ERP + Storefront + AI Copilot) [KHUYEN DUNG]
echo  [2] Chay Development Mode (Port 5173 Vite React + Port 8000 Backend)
echo  [3] Chay toan bo Test Suite (Backend 28 Tests + Frontend 14 Tests)
echo  [4] Reset CSDL mau ve ban dau (Lam moi toan bo du lieu)
echo  [5] Thoat
echo ===============================================================================
set "opt="
set /p opt="Vui long chon [1-5] (Mac dinh la 1): "
if "%opt%"=="" set opt=1
if "%opt%"=="1" goto RUN_UNIFIED
if "%opt%"=="2" goto RUN_DEV
if "%opt%"=="3" goto RUN_FULL_TESTS
if "%opt%"=="4" goto RESET_DB
if "%opt%"=="5" exit /b 0

echo Lua chon khong hop le!
pause
goto MENU

:RUN_UNIFIED
color 0A
echo.
echo ===============================================================================
echo  DANG KHOI CHAY UNIFIED SERVER TAI: http://localhost:8000
echo ===============================================================================
echo  * Cua Hang Truc Tuyen (Storefront):  http://localhost:8000/store
echo  * Quan Tri He Thong (ERP Admin):    http://localhost:8000/login
echo  * API Documentation (Swagger Docs): http://localhost:8000/docs
echo.
echo  TAI KHOAN DANG NHAP TEST MAU:
echo  - Giam Doc / Admin:          admin   / admin123  (Toan quyen quan tri)
echo  - Truong Kho:                kho     / kho123    (Duyet xuat/nhap kho)
echo  - Quan Doc San Xuat:         sx      / sx123     (Lap lenh va ke hoach SX)
echo  - Nhan Vien Thu Mua:         thumua  / thumua123 (Nhap NVL tu nha cung cap)
echo ===============================================================================
echo Nhan Ctrl+C de dung server.
start "" "http://localhost:8000/store"
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
goto END

:RUN_DEV
color 0E
echo.
echo ===============================================================================
echo  DANG KHOI CHAY CHE DO PHAT TRIEN (DEV MODE)
echo ===============================================================================
echo  Backend API:  http://localhost:8000
echo  Frontend Dev: http://localhost:5173
echo ===============================================================================
start "ERP Backend API (Port 8000)" cmd /k "chcp 65001 >nul && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
start "Frontend Dev Server (Port 5173)" cmd /k "chcp 65001 >nul && pushd frontend && npm run dev && popd"
start "" "http://localhost:5173"
goto END

:RUN_FULL_TESTS
color 0D
echo.
echo ===============================================================================
echo  DANG CHAY TOAN BO TEST SUITE (BACKEND + FRONTEND)
echo ===============================================================================
echo [1/2] Backend Unit Tests:
python backend/test_backend.py
echo.
echo [2/2] Frontend Vitest:
pushd frontend
call npm test
popd
echo.
echo Hoan tat kiem thu!
if not "%~1"=="" (
    exit /b 0
)
pause
goto MENU

:RESET_DB
color 0C
echo.
echo [CANH BAO] Thao tac nay se xoa toan bo du lieu hien tai va tai lap tu seed.sql!
set /p confirm="Ban co chac chan muon reset CSDL? (y/N): "
if /i "%confirm%"=="y" (
    python backend/setup_database.py --reset
    echo Da reset CSDL ve trang thai mac dinh!
) else (
    echo Da huy thao tac reset.
)
pause
goto MENU

:END
pause
