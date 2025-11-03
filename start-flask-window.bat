@echo off
echo === Iniciando Flask em nova janela ===
start "TokenCafe Flask Server" python server_flask.py
echo.
echo Servidor Flask iniciado em nova janela!
echo Aguarde alguns segundos ate o servidor estar pronto...
timeout /t 3 /nobreak >nul
echo.
echo Para parar o servidor, feche a janela "TokenCafe Flask Server"
