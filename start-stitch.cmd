@echo off
cd /d "%~dp0"
node scripts\dev-stitch.cjs
if errorlevel 1 pause
