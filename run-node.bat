@echo off
setTitle Space-Time Server (Node.js)
cd /d "%~dp0"
cls

echo Starting local server with Node.js...
echo.
echo Navigate to http://localhost:8000 in your browser.
echo.
echo Press Ctrl+C to stop the server.
echo.

node server.js
