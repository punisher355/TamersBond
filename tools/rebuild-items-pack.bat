@echo off
echo.
echo  Rebuilding Item compendium packs...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0build-items-pack.ps1"
echo.
pause
