@echo off
echo Starting CraterNet.AI v2...
echo.
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)
start "CraterNet Flask" cmd /k "python app.py"
timeout /t 3 /nobreak > NUL
echo Flask running. Starting ngrok tunnel...
echo.
ngrok http 5000 --request-header-add "ngrok-skip-browser-warning:true"
pause
