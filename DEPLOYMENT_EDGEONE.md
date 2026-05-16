# 腾讯云 EdgeOne 部署指南

## 概述

腾讯云 EdgeOne 是一个边缘计算平台，支持：
- ✅ 静态资源托管
- ✅ 边缘函数（Edge Functions）
- ✅ API 代理和转发
- ✅ 自定义域名和 HTTPS

**重要**：EdgeOne 本身不直接运行 Node.js 服务器，需要通过以下方式之一部署后端：

## 部署方案

### 方案 A：EdgeOne + 云服务器 CVM（推荐）

这是最稳定的方案，将前端放在 EdgeOne CDN，后端运行在 CVM 上。

#### 架构
```
用户 → EdgeOne CDN (前端静态文件) → CVM 服务器 (Node.js 后端 API)
```

#### 步骤

##### 1. 准备 CVM 服务器

购买腾讯云 CVM 服务器（最低配置即可）：
- 操作系统：Ubuntu 20.04/22.04 或 CentOS 7+
- 配置：1核 2GB 起步
- 带宽：按使用量计费

##### 2. 在 CVM 上部署后端

SSH 连接到服务器：

```bash
ssh ubuntu@your-server-ip
```

安装 Node.js：

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node --version
npm --version
```

上传项目到服务器（从本地）：

```bash
# 方法1：使用 scp
scp -r videoVaultApp ubuntu@your-server-ip:/home/ubuntu/

# 方法2：使用 Git
git clone <your-repo> /home/ubuntu/videoVaultApp
```

在服务器上部署：

```bash
cd /home/ubuntu/videoVaultApp

# 安装依赖
npm install --production

# 构建前端
npm run build

# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 查看状态
pm2 status
```

配置防火墙：

```bash
# Ubuntu
sudo ufw allow 3001/tcp
sudo ufw enable

# CentOS
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

##### 3. 配置 EdgeOne

登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)

**添加站点：**

1. 点击"添加站点"
2. 输入您的域名（如 `videovault.example.com`）
3. 选择"手动添加 DNS 记录"

**配置 DNS：**

在您的域名服务商处添加 CNAME 记录：
```
类型: CNAME
主机记录: videovault
记录值: <EdgeOne 提供的 CNAME 地址>
```

**配置源站：**

1. 进入站点配置 → 源站配置
2. 添加源站：
   - 源站类型：IP
   - 源站地址：您的 CVM 公网 IP
   - 端口：3001
   - 权重：100

**配置缓存规则：**

1. 进入站点配置 → 缓存配置
2. 添加缓存规则：

```
路径: /*
缓存时间: 忽略（API 请求不缓存）

路径: /assets/*
缓存时间: 30 天

路径: *.js, *.css, *.png, *.jpg, *.gif
缓存时间: 7 天
```

**配置回源协议：**

- 回源协议：HTTP（如果 CVM 未配置 HTTPS）
- 或 HTTPS（如果配置了 SSL）

##### 4. 上传前端到 EdgeOne

**方法 1：使用 EdgeOne 静态托管**

1. 进入 EdgeOne 控制台 → 静态托管
2. 创建存储桶
3. 上传 `dist/` 目录的所有文件
4. 配置默认首页为 `index.html`

**方法 2：通过 CVM Nginx 提供前端**

在 CVM 上安装 Nginx：

```bash
sudo apt-get install nginx
```

配置 Nginx (`/etc/nginx/sites-available/videovault`)：

```nginx
server {
    listen 80;
    server_name _;

    root /home/ubuntu/videoVaultApp/dist;
    index index.html;

    # 前端静态文件
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理到 Node.js
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
        proxy_buffering off;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/videovault /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

##### 5. 测试访问

```bash
# 测试 API
curl https://videovault.example.com/api/videos

# 应该返回 JSON 数据
```

---

### 方案 B：EdgeOne + 云函数 SCF（Serverless）

适合小规模应用，无需管理服务器。

#### 架构
```
用户 → EdgeOne → 云函数 SCF (Express 适配)
```

#### 步骤

##### 1. 改造应用为 Serverless

创建 `scf_bootstrap` 文件（云函数入口）：

```bash
#!/var/lang/node18/bin/node

const express = require('express');
const path = require('path');
const fs = require('fs');

// 导入原有的 Express 应用逻辑
// 需要将 server/index.ts 改造为可导出的 app

const app = express();
const PORT = process.env.PORT || 9000;

// ... 复制 server/index.ts 的路由逻辑 ...

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

##### 2. 创建云函数

1. 登录 [云函数控制台](https://console.cloud.tencent.com/scf)
2. 创建函数：
   - 函数类型：Web 函数
   - 运行环境：Node.js 18
   - 提交方法：代码包

##### 3. 打包上传

```bash
# 压缩项目
zip -r videovault.zip . -x "node_modules/*" "data/*" ".git/*"

# 上传到云函数
```

##### 4. 配置 EdgeOne 回源

- 源站类型：云函数
- 选择创建的云函数

**注意**：此方案需要较多改造工作，且冷启动可能有延迟。

---

### 方案 C：EdgeOne + TKE 容器服务（企业级）

适合大规模、高可用需求。

#### 步骤

1. 创建 Docker 镜像（使用之前的 Dockerfile）
2. 推送到腾讯云容器镜像服务
3. 在 TKE 中部署应用
4. 配置 EdgeOne 回源到 TKE LoadBalancer

---

## 关键配置要点

### 1. CORS 配置

如果您的前端和后端在不同域名，需要在 Express 中配置 CORS：

```typescript
// server/index.ts 已经包含
app.use(cors())
```

### 2. 视频流优化

在 EdgeOne 中配置：
- 关闭视频流的缓存
- 启用 Range 请求支持
- 配置合适的超时时间（视频可能较大）

### 3. 数据持久化

**重要**：确保 `data/` 目录的数据不会丢失

**CVM 方案**：
- 数据存储在服务器本地
- 定期备份 `data/app-data.json` 和 `data/thumbnails/`

**SCF 方案**：
- 需要使用 COS（对象存储）存储数据
- 需要改造代码使用 COS SDK

### 4. 安全组配置

在 CVM 安全组中开放：
- 入站：TCP 3001（来自 EdgeOne IP 段）
- 或：TCP 80/443（如果使用 Nginx）

---

## 成本估算

### 方案 A（CVM）月度成本

| 项目 | 配置 | 月费用（约） |
|------|------|-------------|
| CVM | 1核 2GB | ¥65 |
| 带宽 | 5Mbps | ¥125 |
| EdgeOne | 基础版 | ¥0-50 |
| **总计** | | **¥190-240** |

### 方案 B（SCF）月度成本

| 项目 | 用量 | 月费用（约） |
|------|------|-------------|
| 云函数 | 100万次调用 | ¥0-20 |
| EdgeOne | 基础版 | ¥0-50 |
| **总计** | | **¥0-70** |

*注：SCF 有免费额度，小流量几乎免费*

---

## 故障排查

### 问题 1：API 返回 502 Bad Gateway

**原因**：EdgeOne 无法连接到后端

**解决**：
```bash
# 检查 CVM 上的服务是否运行
pm2 status

# 检查端口是否监听
netstat -tlnp | grep 3001

# 检查防火墙
sudo ufw status

# 测试本地访问
curl http://localhost:3001/api/videos
```

### 问题 2：前端加载正常，API 请求失败

**原因**：回源配置错误

**解决**：
1. 检查 EdgeOne 源站配置
2. 确认源站地址和端口正确
3. 检查安全组是否允许 EdgeOne IP 访问

### 问题 3：视频无法播放

**原因**：Range 请求被阻止或缓冲问题

**解决**：
1. EdgeOne 配置中启用 Range 请求
2. 关闭视频流的缓存
3. 增加超时时间

---

## 推荐方案总结

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 个人使用/小团队 | 方案 A (CVM) | 简单稳定，成本低 |
| 临时演示/测试 | 方案 B (SCF) | 几乎免费，无需维护 |
| 生产环境/大规模 | 方案 C (TKE) | 高可用，易扩展 |

**对于大多数用户，推荐使用方案 A（CVM）**，平衡了成本、稳定性和易用性。

---

## 快速开始（方案 A）

```bash
# 1. 购买 CVM（腾讯云控制台）

# 2. SSH 连接
ssh ubuntu@YOUR_SERVER_IP

# 3. 一键部署
curl -o deploy.sh https://raw.githubusercontent.com/your-repo/videoVaultApp/main/deploy.sh
chmod +x deploy.sh
./deploy.sh

# 4. 配置 EdgeOne 回源到 CVM IP:3001

# 5. 完成！
```

如需帮助，请参考完整的 [DEPLOYMENT.md](./DEPLOYMENT.md)
