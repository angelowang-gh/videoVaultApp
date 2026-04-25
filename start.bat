@echo off
chcp 65001 >nul 2>&1
echo ========================================
echo   VideoVault App 启动中...
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

:: Check dist folder
if not exist "%~dp0dist\index.html" (
    echo [错误] 未找到 dist\index.html
    echo 请先运行 build.bat 构建项目
    pause
    exit /b 1
)

:: Check node_modules
if not exist "%~dp0node_modules" (
    echo 正在安装依赖...
    npm install --production
    echo.
)

echo 启动服务器...
echo 访问地址: http://localhost:3001
echo 按 Ctrl+C 停止服务器
echo.
npx tsx server/index.ts
pause
