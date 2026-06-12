@echo off
echo.
echo  Rebuilding Core Rulebook compendium pack...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0build-rulebook-pack.ps1"
echo.
pause
