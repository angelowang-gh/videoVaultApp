# VideoVault - 视频管理应用

一个功能完整的本地视频管理和播放应用，支持视频浏览、标签管理、元数据编辑、播放列表等功能。

## ✨ 特性

- 🎬 **视频浏览**：网格和列表视图，支持排序和筛选
- 🏷️ **标签系统**：为视频添加彩色标签，快速分类
- 📊 **元数据管理**：评分、国家、场景、人物等属性
- ▶️ **视频播放**：内置播放器，支持多种格式
- 📋 **播放列表**：创建和管理播放列表
- 🖼️ **缩略图**：自动生成和缓存视频封面
- 📱 **响应式设计**：适配不同屏幕尺寸

## 🛠️ 技术栈

- **前端**：React 18 + TypeScript + Vite
- **UI**：Tailwind CSS + Lucide Icons
- **路由**：React Router DOM
- **后端**：Express.js + TypeScript
- **视频处理**：fluent-ffmpeg

## 🚀 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 生产环境

```bash
# 构建
npm run build

# 启动服务器
npm run dev:server
# 或
./start.bat  # Windows
./start.sh   # Linux/Mac
```

## 📦 部署

### 重要提示

⚠️ **本应用需要后端服务器支持**，不能仅部署到静态托管服务（如 GitHub Pages、OSS、S3 等）。

### 推荐部署方案

#### 1. 传统服务器（VPS/CVM）

最简单的部署方式，适合个人和小团队使用。

📖 详细指南：[DEPLOYMENT.md](./DEPLOYMENT.md)

```bash
# 在服务器上执行
git clone <your-repo>
cd videoVaultApp
./deploy.sh
```

#### 2. 腾讯云 EdgeOne + CVM

使用 EdgeOne CDN 加速，后端运行在 CVM 上。

📖 详细指南：[DEPLOYMENT_EDGEONE.md](./DEPLOYMENT_EDGEONE.md)
📋 检查清单：[EDGEONE_CHECKLIST.md](./EDGEONE_CHECKLIST.md)

**架构**：
```
用户 → EdgeOne CDN → CVM (Node.js 后端)
```

#### 3. PaaS 平台

- **Railway**：连接 GitHub 自动部署
- **Render**：创建 Web Service
- **Fly.io**：使用 Flyctl 部署

#### 4. Docker

```bash
docker-compose up -d
```

### 不推荐的部署方式

❌ **纯静态托管服务**：
- GitHub Pages
- 阿里云 OSS / 腾讯云 COS（单独使用）
- AWS S3（单独使用）
- Netlify（无 Functions）
- Vercel（无 Serverless 改造）

这些服务不支持 Node.js 后端，会导致 API 请求失败。

## 📁 项目结构

```
videoVaultApp/
├── src/                    # 前端源代码
│   ├── components/         # React 组件
│   ├── lib/                # 工具库
│   └── App.tsx             # 应用入口
├── server/                 # 后端服务器
│   └── index.ts            # Express 服务器
├── data/                   # 数据存储
│   ├── app-data.json       # 应用数据
│   └── thumbnails/         # 缩略图缓存
├── dist/                   # 构建输出
├── DEPLOYMENT.md           # 部署指南
├── DEPLOYMENT_EDGEONE.md   # EdgeOne 部署指南
└── package.json
```

## 🔧 配置

### 环境变量

创建 `.env` 文件（可选）：

```env
PORT=3001
NODE_ENV=production
```

### 扫描路径

在应用设置中添加要扫描的视频文件夹路径。

## 📝 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/videos` | GET | 获取所有视频 |
| `/api/scan-paths` | GET/POST/DELETE | 管理扫描目录 |
| `/api/tags` | GET/POST | 管理标签 |
| `/api/videos/:id/tags` | PUT | 更新视频标签 |
| `/api/videos/:id/meta` | PUT | 更新视频元数据 |
| `/video-stream/:id` | GET | 视频流（支持 Range） |
| `/api/thumbnails/:id` | GET/POST | 缩略图管理 |

## 🐛 常见问题

### Q: 添加文件夹时出现 "JSON.parse" 错误

**A**: 这是因为部署到了不支持后端的静态托管服务。请参考部署指南，使用支持 Node.js 的平台。

### Q: 视频无法播放

**A**: 
1. 检查视频路径是否正确
2. 确保服务器有读取权限
3. 检查浏览器是否支持该视频格式

### Q: 缩略图未显示

**A**: 
1. 首次加载时会异步生成缩略图
2. 检查 `data/thumbnails/` 目录是否有写权限
3. 刷新页面重试

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请查看：
- [部署指南](./DEPLOYMENT.md)
- [EdgeOne 部署](./DEPLOYMENT_EDGEONE.md)
- [检查清单](./EDGEONE_CHECKLIST.md)
