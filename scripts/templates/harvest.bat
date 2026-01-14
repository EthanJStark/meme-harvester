@echo off
setlocal

set "NODE_BIN=%~dp0bin\node.exe"

REM Validate bundle integrity
if not exist "%NODE_BIN%" (
  echo Error: Node binary not found at %NODE_BIN% >&2
  echo Bundle may be corrupted. Please re-download. >&2
  exit /b 1
)

"%NODE_BIN%" "%~dp0dist\cli.js" %*
