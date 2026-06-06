@echo off
echo.
echo  Rebuilding Classes compendium packs...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0build-classes-pack.ps1"
echo.
pause
