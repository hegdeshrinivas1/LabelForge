@echo off
title LabelForge - Seed Database
echo ====================================================
echo Seeding LabelForge Demo Database
echo ====================================================
cd /d "%~dp0labelforge\backend"
call venv\Scripts\activate.bat
python seed.py
pause
