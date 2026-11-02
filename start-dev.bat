@echo off
cd /d "%~dp0"
echo Starting UniCampus Dev Server (npm run dev)...
call npm.cmd run dev
pause
