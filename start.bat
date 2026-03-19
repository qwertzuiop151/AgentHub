@echo off
cd /d F:\CLAUDECODE\Projects\AgentHub
set CLAUDECODE=
echo Building...
call npm run build >nul 2>&1
echo Starting AgentHub...
npx electron .
