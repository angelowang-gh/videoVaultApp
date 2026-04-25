@echo off
chcp 65001 >nul 2>&1
echo ========================================
echo   VideoVault App 构建中...
echo ========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: Install dependencies
if not exist "%~dp0node_modules" (
    echo 正在安装依赖...
    npm install
    echo.
)

:: Build frontend
echo 正在构建前端...
npx vite build
if %errorlevel% neq 0 (
    echo [错误] 构建失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo   构建完成！
echo   运行 start.bat 启动应用
echo ========================================
pause
