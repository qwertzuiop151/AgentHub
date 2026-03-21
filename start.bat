@echo off
cd /d "%~dp0"
set CLAUDECODE=
echo Building...
call npm run build >nul 2>&1
echo Starting AgentHub...
npx electron .
