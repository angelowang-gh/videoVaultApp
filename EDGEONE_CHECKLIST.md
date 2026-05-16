# EdgeOne 部署检查清单

## 📋 部署前准备

- [ ] 已购买腾讯云 CVM 服务器
- [ ] CVM 安全组已开放端口 3001
- [ ] 已准备好域名（可选，用于自定义域名）
- [ ] 本地项目已完成构建（`npm run build`）

## 🚀 CVM 服务器配置

### 1. 连接服务器
```bash
ssh ubuntu@YOUR_SERVER_IP
```

### 2. 安装 Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # 应显示 v18.x.x
```

### 3. 上传项目
```bash
# 从本地执行
scp -r videoVaultApp ubuntu@YOUR_SERVER_IP:/home/ubuntu/
```

### 4. 部署应用
```bash
cd /home/ubuntu/videoVaultApp
npm install --production
npm run build
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. 验证服务
```bash
# 在服务器上测试
curl http://localhost:3001/api/videos

# 应该返回 JSON 数据
```

### 6. 配置防火墙
```bash
sudo ufw allow 3001/tcp
sudo ufw enable
```

## 🌐 EdgeOne 配置

### 1. 添加站点
- [ ] 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
- [ ] 点击"添加站点"
- [ ] 输入域名（如 `videovault.example.com`）
- [ ] 记录 EdgeOne 提供的 CNAME 地址

### 2. 配置 DNS
在域名服务商处添加：
```
类型: CNAME
主机记录: videovault (或 @)
记录值: <EdgeOne 提供的 CNAME>
TTL: 600
```

等待 DNS 生效（通常 10-30 分钟）

### 3. 配置源站
- [ ] 进入站点 → 源站配置
- [ ] 添加源站：
  - 源站类型：**IP**
  - 源站地址：**CVM 公网 IP**
  - 端口：**3001**
  - 权重：100
  - 协议：HTTP

### 4. 配置缓存规则
- [ ] 进入站点 → 缓存配置
- [ ] 添加规则：

| 路径 | 缓存时间 | 说明 |
|------|---------|------|
| `/api/*` | 忽略 | API 不缓存 |
| `/video-stream/*` | 忽略 | 视频流不缓存 |
| `/assets/*` | 30 天 | 静态资源 |
| `*.js, *.css` | 7 天 | JS/CSS 文件 |
| `/*.html` | 1 小时 | HTML 文件 |

### 5. 高级配置
- [ ] 启用 HTTPS（推荐）
  - 进入站点 → HTTPS 配置
  - 申请免费 SSL 证书
  - 强制 HTTPS 跳转

- [ ] 配置跨域（如果需要）
  - 进入站点 → 跨域配置
  - 添加允许的域名

## ✅ 测试验证

### 1. 测试 API
```bash
curl https://videovault.example.com/api/videos
```
预期：返回 JSON 数据

### 2. 测试前端
浏览器访问：`https://videovault.example.com`
预期：正常加载页面

### 3. 测试添加文件夹
- 打开设置
- 添加一个存在的文件夹路径
- 预期：成功添加，无错误

### 4. 测试视频播放
- 浏览视频列表
- 点击播放视频
- 预期：视频正常播放

## 🔧 故障排查

### API 返回 502/504
```bash
# 检查服务是否运行
pm2 status

# 检查日志
pm2 logs videovault

# 重启服务
pm2 restart videovault
```

### 前端无法访问
- 检查 DNS 是否生效：`nslookup videovault.example.com`
- 检查 EdgeOne 状态：控制台查看站点状态
- 清除浏览器缓存

### 视频无法播放
- 检查 EdgeOne 视频流缓存配置（应设为"忽略"）
- 检查 CVM 带宽是否足够
- 查看浏览器控制台错误

## 📊 监控和维护

### 日常检查
```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs videovault --lines 50

# 查看资源使用
pm2 monit
```

### 备份数据
```bash
# 定期备份 data 目录
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# 或使用 rsync 同步到其他位置
rsync -avz data/ backup-server:/backup/videovault/
```

### 更新应用
```bash
# 拉取最新代码
git pull

# 重新构建
npm run build

# 重启服务
pm2 restart videovault
```

## 💰 成本优化

### EdgeOne 费用
- 基础版：免费额度内免费
- 超出后：按流量和请求数计费
- 建议：设置用量告警

### CVM 费用
- 选择按量计费（测试用）
- 选择包年包月（长期使用更优惠）
- 使用轻量应用服务器（更便宜）

## 🎯 完成标志

当以下所有项都打勾时，部署成功：

- [ ] CVM 服务正常运行
- [ ] EdgeOne 站点状态为"已启用"
- [ ] DNS 解析正确
- [ ] HTTPS 配置完成（可选）
- [ ] API 请求正常
- [ ] 前端页面正常加载
- [ ] 可以添加文件夹
- [ ] 视频可以正常播放
- [ ] 数据持久化正常

## 📞 获取帮助

遇到问题？

1. 查看完整文档：[DEPLOYMENT.md](./DEPLOYMENT.md)
2. 查看 EdgeOne 文档：[腾讯云 EdgeOne 文档](https://cloud.tencent.com/document/product/1542)
3. 查看应用日志：`pm2 logs videovault`
4. 检查 EdgeOne 诊断工具：控制台 → 诊断工具

---

**提示**：保存此检查清单，每次部署时按步骤操作可以避免遗漏。
