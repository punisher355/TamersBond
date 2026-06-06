@echo off
echo.
echo  Rebuilding Digimon Forms compendium pack...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0build-digimon-pack.ps1"
echo.
pause
