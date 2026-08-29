@echo off
echo.
echo  Rebuilding Effects compendium pack...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0build-effects-pack.ps1"
echo.
pause
