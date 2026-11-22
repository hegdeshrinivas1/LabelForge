@echo off
echo ====================================================
echo Launching LabelForge Full Stack Platform
echo ====================================================
start "LabelForge Backend" cmd /k "%~dp0run_backend.bat"
start "LabelForge Frontend" cmd /k "%~dp0run_frontend.bat"
echo.
echo Both servers have been launched in separate terminal windows!
echo Backend API : http://localhost:8000/docs
echo Frontend UI : http://localhost:5173
echo.
pause
