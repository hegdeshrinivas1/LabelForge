@echo off
title LabelForge - Frontend Dev Server
echo ====================================================
echo Starting LabelForge Frontend (React + Vite)
echo ====================================================
set "PATH=C:\Users\shrin\nodejs\node-v20.18.0-win-x64;%PATH%"
cd /d "%~dp0labelforge\frontend"
call npm run dev -- --host 127.0.0.1 --port 5173
pause
