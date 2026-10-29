param(
    [string]$TunnelToken = "eyJhIjoiMjhmNjA2MjE2NTdmMTZkNGExN2ZlZmYyNWFhZjY5NDgiLCJ0IjoiZDk2OThhMzEtMDUwMC00MTY4LWE0ZmYtNGM5MWNiYzI1YTE2IiwicyI6IllqRTJNREJqTkdVdE5EQXpaUzAwWWpaakxXSXlNakl0TkdWbU56ZzROV1l6WXpneiJ9",
    [int]$Port = 8000,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $RootDir "frontend"
$BackendDir = Join-Path $RootDir "backend"
$ToolsDir = Join-Path $RootDir "tools"
$CloudflaredExe = Join-Path $ToolsDir "cloudflared.exe"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  DEPLOY HE THONG ERP & STOREFRONT QUA CLOUDFLARE TUNNEL (v1.7.0)" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Kiem tra cloudflared.exe
$SysCloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($SysCloudflared) {
    $CloudflaredExe = $SysCloudflared.Source
}
Write-Host "[1/4] Su dung cloudflared tai: $CloudflaredExe" -ForegroundColor Green

# 2. Kiem tra ban build frontend/dist
$DistIndex = Join-Path $FrontendDir "dist\index.html"
if (-not $SkipBuild -and -not (Test-Path $DistIndex)) {
    Write-Host "[2/4] Dang dong goi giao dien Production (npm run build)..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    try {
        npm run build
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[2/4] Da co san ban build frontend/dist/index.html" -ForegroundColor Green
}

# 3A. Khoi dong Unified Server (FastAPI + React SPA) tren cong 8000
$Port8000Busy = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $Port8000Busy) {
    Write-Host "[3/4] Dang khoi dong Unified Server (Frontend + Backend API) tai http://127.0.0.1:8000 ..." -ForegroundColor Yellow
    Start-Process -FilePath "python" -ArgumentList "main.py" -WorkingDirectory $BackendDir -WindowStyle Hidden
    Start-Sleep -Seconds 2
}
Write-Host "      -> Unified Server san sang tai http://127.0.0.1:8000" -ForegroundColor Green

# 3B. Khoi dong them Vite Server tren cong 3000 (allowedHosts: true) de ho tro ca cau hinh tro ve 3000 hoac 8000
$Port3000Busy = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $Port3000Busy) {
    Write-Host "      -> Dang khoi dong Vite Server tai http://127.0.0.1:3000 ..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev -- --host 0.0.0.0 --port 3000" -WorkingDirectory $FrontendDir -WindowStyle Hidden
    Start-Sleep -Seconds 2
}
Write-Host "      -> Vite Server san sang tai http://127.0.0.1:3000" -ForegroundColor Green

# 4. Ket noi Cloudflare Zero Trust Named Tunnel bang Token
Write-Host "[4/4] Dang ket noi Cloudflare Zero Trust Tunnel..." -ForegroundColor Cyan
& $CloudflaredExe tunnel --no-autoupdate --protocol http2 --edge-ip-version 4 run --token $TunnelToken
