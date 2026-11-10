@echo off
cd /d "%~dp0"
set "PATH=C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs;%PATH%"
echo Starting UniCampus Backend API (http://localhost:5000) & Frontend Dev Server (http://localhost:5173)...
start "UniCampus Backend API" cmd /c "cd /d "%~dp0backend" && npm.cmd start"
call npm.cmd run dev
pause
