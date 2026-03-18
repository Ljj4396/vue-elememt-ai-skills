@echo off
setlocal
echo Starting Go backend build...

set "GO_CMD=go"
where go >nul 2>nul
if %errorlevel% neq 0 (
    if exist "D:\go\bin\go.exe" (
        set "GO_CMD=D:\go\bin\go.exe"
    ) else (
        echo Go compiler not found. Install Go or add it to PATH.
        goto :fail
    )
)

pushd "%~dp0" || goto :fail

REM Download Go dependencies
echo Downloading Go dependencies...
"%GO_CMD%" mod download || goto :fail

REM Build frontend
echo Building frontend assets...
pushd ".." || goto :fail
call npm run build || goto :fail

REM Copy dist to server-go
echo Copying frontend assets to server-go...
if exist "server-go\dist" rmdir /s /q "server-go\dist"
xcopy /e /i /y "dist" "server-go\dist" >nul || goto :fail
popd

REM Build Go binary
echo Building Go binary...
if not exist "..\release" mkdir "..\release"
"%GO_CMD%" build -ldflags="-s -w" -o "..\release\vue-element-ui.exe" || goto :fail

REM Optional UPX compression (opt-in only; some environments may block packed executables)
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
