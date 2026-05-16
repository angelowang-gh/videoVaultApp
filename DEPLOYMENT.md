# VideoVault 部署指南

## 问题说明

当前应用包含前端和后端两部分：
- **前端**：React + Vite（静态文件）
- **后端**：Express.js（动态 API 服务）

如果只将 `dist/` 目录上传到静态托管服务（如 OSS、S3、GitHub Pages），API 请求会失败，因为：
- 静态托管服务不支持 Node.js
- API 路由（POST、DELETE 等）无法处理
- 会出现 "MethodNotAllowed" 或 JSON 解析错误

## 部署方案

### 方案 A：传统服务器部署（推荐）

适用于：VPS、云服务器、自有服务器

#### 1. 准备服务器环境

```bash
# 安装 Node.js (推荐 v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 2. 上传项目文件

将整个项目目录上传到服务器，或使用 Git：

```bash
git clone <your-repo-url>
cd videoVaultApp
```

#### 3. 安装依赖并构建

```bash
# 安装所有依赖
npm install

# 构建前端
npm run build
```

#### 4. 启动服务

```bash
# 直接启动（测试用）
npx tsx server/index.ts

# 或使用提供的脚本
./start.bat  # Windows
# 或创建 start.sh for Linux/Mac
```

#### 5. 使用 PM2 保持服务运行（生产环境推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server/index.ts --name videovault --interpreter tsx

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs videovault
```

#### 6. 配置 Nginx 反向代理（可选但推荐）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/videoVaultApp/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理到 Node.js 后端
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 视频流代理
    location /video-stream/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;  # 重要：视频流需要禁用缓冲
    }
}
```

### 方案 B：PaaS 平台部署

适用于：Railway、Render、Fly.io 等平台

#### Railway 部署示例

1. 创建 `railway.json`：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run build && npx tsx server/index.ts",
    "healthcheckPath": "/api/videos",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

2. 创建 `nixpacks.toml`：

```toml
[phases.setup]
nixPkgs = ["nodejs_18"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npx tsx server/index.ts"
```

3. 连接到 Railway 并部署：

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

#### Render 部署示例

1. 创建 `render.yaml`：

```yaml
services:
  - type: web
    name: videovault
    env: node
    buildCommand: npm install && npm run build
    startCommand: npx tsx server/index.ts
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
```

### 方案 C：Docker 容器化部署

1. 创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npx", "tsx", "server/index.ts"]
```

2. 创建 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  videovault:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
      - /path/to/your/videos:/videos:ro
    restart: unless-stopped
```

3. 启动：

```bash
docker-compose up -d
```

## 重要注意事项

### 1. 数据持久化

确保 `data/` 目录被正确挂载或备份：
- `data/app-data.json` - 应用配置和元数据
- `data/thumbnails/` - 视频缩略图缓存

### 2. 视频文件访问

后端需要能够访问您添加的视频文件夹：
- 确保路径在服务器上存在
- 确保 Node.js 进程有读取权限
- 考虑使用绝对路径

### 3. 防火墙和安全组

开放端口 3001（或您配置的端口）：

```bash
# Ubuntu/Debian
sudo ufw allow 3001/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

### 4. HTTPS 配置

生产环境建议使用 HTTPS：

```bash
# 使用 Let's Encrypt（配合 Nginx）
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 快速测试

部署后，测试以下端点：

```bash
# 测试 API 是否正常
curl http://your-server:3001/api/videos

# 应该返回 JSON，而不是 HTML 或 XML 错误
```

## 故障排查

### 问题：API 返回 HTML 而不是 JSON

**原因**：请求没有到达 Express 服务器

**解决**：
1. 检查服务器是否运行：`pm2 status` 或 `ps aux | grep tsx`
2. 检查端口是否正确：`netstat -tlnp | grep 3001`
3. 检查防火墙设置
4. 如果使用 Nginx，检查代理配置

### 问题：无法访问视频文件

**原因**：路径不存在或权限不足

**解决**：
```bash
# 检查路径是否存在
ls -la /path/to/your/videos

# 修复权限
chmod -R 755 /path/to/your/videos
```

### 问题：缩略图无法生成

**原因**：FFmpeg 不可用或 data 目录无写权限

**解决**：
```bash
# 检查 FFmpeg
which ffmpeg

# 修复 data 目录权限
chmod -R 755 data/
chown -R $USER:$USER data/
```

## 总结

❌ **不要**：只上传 dist/ 到静态托管服务
✅ **应该**：部署完整的 Node.js 应用到支持服务端的平台

选择适合您的部署方案，确保前后端都能正常运行。
