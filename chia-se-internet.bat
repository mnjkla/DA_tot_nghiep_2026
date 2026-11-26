@echo off
chcp 65001 >nul
title [ERP YEN VA CA PHE] - Chia Se Server Ra Internet Qua Cloudflare Tunnel
color 0A

echo ===============================================================================
echo       HE THONG QUAN TRI DOANH NGHIEP YEN SAO VA CA PHE (ERP + AI SYSTEM)
echo            CHIA SE SERVER RA INTERNET QUA CLOUDFLARE CHO GIANG VIEN XEM
echo ===============================================================================
echo.
echo * Luu y quan trong:
echo   1. Laptop cua ban phai dang mo va chay backend tai http://localhost:8000
echo   2. Khong dong cua so nay trong suot thoi gian giang vien dang xem he thong
echo.

:: 1. Kiem tra xem cloudflared.exe da co san chua
if not exist "cloudflared.exe" (
    echo [THONG BAO] Chua tim thay cloudflared.exe. Dang tu dong tai ve tu Cloudflare...
    curl.exe -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    if not exist "cloudflared.exe" (
        color 0C
        echo [LOI] Khong the tai cloudflared.exe! Vui long kiem tra ket noi mang.
        pause
        exit /b 1
    )
    echo [THANH CONG] Da tai xong cloudflared.exe!
    echo.
)

:: 2. Kiem tra xem backend port 8000 co dang chay khong
echo Dang kiem tra backend port 8000...
powershell -Command "if ((Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue).Count -gt 0) { exit 0 } else { exit 1 }"
if %errorlevel% neq 0 (
    color 0E
    echo [CANH BAO] Khong phat hien server dang lang nghe tai cong 8000!
    echo Ban hay nho mo them 1 cua so cmd va chay lenh sau:
    echo   python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
    echo   (Hoac nhap dup chay start-project.bat va chon [1])
    echo.
    echo Nhan phim bat ky de tiep tuc mo Cloudflare Tunnel...
    pause >nul
) else (
    echo [XAC NHAN] Backend port 8000 dang hoat dong tot!
)
echo.

echo ===============================================================================
echo           DANG KHOI TAO DUONG HAM CLOUDFLARE HTTPS RA INTERNET...
echo ===============================================================================
echo.
echo * Sau it giay, Cloudflare se in ra 1 duong link HTTPS co duoi:
echo   https://xxxx.trycloudflare.com
echo.
echo * Ban hay COPY duong link do gui cho Giang vien:
echo   - Cong Ban Hang (Storefront): https://xxxx.trycloudflare.com/store
echo   - Quan Tri ERP (Admin Login): https://xxxx.trycloudflare.com/login
echo.
echo Nhan Ctrl+C de dung chia se.
echo ===============================================================================
echo.

.\cloudflared.exe tunnel --url http://localhost:8000
pause
