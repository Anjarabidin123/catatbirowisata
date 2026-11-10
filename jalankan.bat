@echo off
title Aplikasi Biro Wisata (Trip Catat App)
color 0B
echo ========================================================
echo       MENJALANKAN APLIKASI BIRO WISATA (PORT 8080)
echo ========================================================
echo Membuka browser: http://localhost:8080/
start http://localhost:8080/
node --max-http-header-size=131072 ./node_modules/vite/bin/vite.js
pause
