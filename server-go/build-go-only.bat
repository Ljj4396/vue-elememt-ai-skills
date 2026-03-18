@echo off
setlocal
echo Building Go backend only (skipping frontend build)...

set "GO_CMD=go"
where go >nul 2>nul
if %errorlevel% neq 0 (
    if exist "D:\go\bin\go.exe" (
        set "GO_CMD=D:\go\bin\go.exe"
    ) else (
        echo Go compiler not found. Install Go or add it to PATH.
        pause
        exit /b 1
    )
)

pushd "%~dp0" || goto :fail

REM Download Go dependencies
echo Downloading Go dependencies...
"%GO_CMD%" mod download || goto :fail

REM Build Go binary
echo Building Go binary...
if not exist "..\release" mkdir "..\release"
"%GO_CMD%" build -ldflags="-s -w" -o "..\release\vue-element-ui.exe" || goto :fail

if /i "%USE_UPX%"=="1" (
    where upx >nul 2>nul
    if %errorlevel% equ 0 (
        echo Compressing executable with UPX...
        upx --best --lzma "..\release\vue-element-ui.exe"
    ) else (
        echo USE_UPX=1 was set, but UPX was not found. Skipping compression.
    )
) else (
    echo Skipping UPX compression. Set USE_UPX=1 to enable it explicitly.
)

echo.
echo Build completed.
echo Executable output: ..\release\vue-element-ui.exe
dir "..\release\vue-element-ui.exe"
pause
exit /b 0

:fail
echo.
echo Build failed. Please check errors above.
pause
exit /b 1
