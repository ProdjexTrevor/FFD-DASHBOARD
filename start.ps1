Param(
  [switch]$Install
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if ($Install) {
  Write-Host "Installing dependencies..." -ForegroundColor Cyan
  npm install
  npm install --prefix client
}

Write-Host "Starting First Dealer Direct Dashboard..." -ForegroundColor Cyan
Write-Host "  Dashboard: http://localhost:5173" -ForegroundColor Green
Write-Host "  API:       http://localhost:3001" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Yellow
Write-Host ""

npm run dev
