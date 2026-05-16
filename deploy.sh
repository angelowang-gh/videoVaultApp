#!/bin/bash

# VideoVault 快速部署脚本
# 用于在 Linux/Mac 服务器上快速部署应用

set -e  # 遇到错误时退出

echo "========================================"
echo "  VideoVault 部署脚本"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js
echo -n "检查 Node.js... "
if ! command -v node &> /dev/null; then
    echo -e "${RED}未找到${NC}"
    echo ""
    echo "请先安装 Node.js 18+："
    echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}已安装 ($NODE_VERSION)${NC}"
fi

# 检查 npm
echo -n "检查 npm... "
if ! command -v npm &> /dev/null; then
    echo -e "${RED}未找到${NC}"
    exit 1
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}已安装 ($NPM_VERSION)${NC}"
fi

echo ""

# 安装依赖
echo -e "${YELLOW}正在安装依赖...${NC}"
npm install --production
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# 构建前端
echo -e "${YELLOW}正在构建前端...${NC}"
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 创建日志目录
mkdir -p logs

# 检查 PM2
echo -n "检查 PM2... "
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}未安装${NC}"
    echo -e "${YELLOW}是否安装 PM2? (推荐用于生产环境) [y/N]: ${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        npm install -g pm2
        echo -e "${GREEN}✓ PM2 安装完成${NC}"
    else
        USE_PM2=false
    fi
else
    echo -e "${GREEN}已安装${NC}"
    USE_PM2=true
fi

echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""

if [ "$USE_PM2" = true ]; then
    echo -e "${GREEN}使用 PM2 启动服务：${NC}"
    echo "  pm2 start ecosystem.config.js"
    echo "  pm2 save"
    echo "  pm2 startup"
    echo ""
    echo "查看状态："
    echo "  pm2 status"
    echo "  pm2 logs videovault"
else
    echo -e "${YELLOW}手动启动服务：${NC}"
    echo "  npx tsx server/index.ts"
    echo "  或"
    echo "  ./start.sh"
fi

echo ""
echo "访问地址: http://localhost:3001"
echo ""
echo "重要提示："
echo "  1. 确保防火墙开放了 3001 端口"
echo "  2. data/ 目录会存储应用数据和缩略图"
echo "  3. 添加的视频路径必须在服务器上存在且可读"
echo ""
