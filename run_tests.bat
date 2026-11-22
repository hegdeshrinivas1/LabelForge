@echo off
title LabelForge - Automated Integration Tests
echo ====================================================
echo Running LabelForge Pytest Suite (22 Tests)
echo ====================================================
cd /d "%~dp0labelforge\backend"
call venv\Scripts\activate.bat
pytest -v
pause
