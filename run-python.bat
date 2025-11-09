@echo off
setTitle Space-Time Server
cls

echo Starting local server...
echo.
echo Navigate to http://localhost:8000 in your browser.
echo.
echo Press Ctrl+C to stop the server.
echo.

python -m http.server 8000
