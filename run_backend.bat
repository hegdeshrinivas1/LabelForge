@echo off
title LabelForge - Backend API Server
echo ====================================================
echo Starting LabelForge Backend (FastAPI + Uvicorn)
echo ====================================================
cd /d "%~dp0labelforge\backend"
call venv\Scripts\activate.bat
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
