@echo off
echo.
echo ========================================
echo   TokenCafe - Reiniciar Servidor Flask
echo ========================================
echo.

REM Matar todos os processos Python
echo [1/3] Encerrando processos Python...
taskkill /F /IM python.exe >nul 2>&1
timeout /t 1 /nobreak >nul

REM Limpar cache Python
echo [2/3] Limpando cache Python...
if exist __pycache__ rmdir /s /q __pycache__
if exist *.pyc del /q *.pyc

REM Iniciar servidor
echo [3/3] Iniciando servidor Flask...
echo.
python server_flask.py

pause
