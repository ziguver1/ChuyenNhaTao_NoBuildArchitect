@echo off
chcp 65001 >nul
title Chuyen Nha Tao - Landing page
cd /d "%~dp0"

echo.
echo   CHUYEN NHA TAO - Landing page (Co du API may chu)
echo   Dang khoi dong may chu tai http://localhost:5174
echo   Dong cua so nay de tat trang.
echo.

where node >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:5174
  node dev-server.js
  goto :eof
)

echo   Khong tim thay Node.js hoac Python tren may.
echo   Cai Node.js (ban LTS) tai https://nodejs.org roi chay lai file nay.
echo.
pause
