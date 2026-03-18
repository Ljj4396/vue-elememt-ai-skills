# Go 后端故障排除指南

## 常见问题与解决方案

---

## 1. 安装和环境问题

### 问题：`go: command not found`

**原因：** Go 未安装或未添加到 PATH

**解决方案：**

**Windows：**
```bash
# 1. 下载安装 Go
# 访问 https://go.dev/dl/
# 下载 go1.21.x.windows-amd64.msi

# 2. 验证安装
go version

# 3. 如果仍然无效，手动添加到 PATH
# 右键"此电脑" → 属性 → 高级系统设置 → 环境变量
# 在 Path 中添加: C:\Program Files\Go\bin
```

---

### 问题：`go mod download` 下载速度慢

**原因：** 国内网络限制

**解决方案：**

```bash
# 设置国内代理
go env -w GOPROXY=https://goproxy.cn,direct

# 重新下载依赖
cd server-go
go mod download
```

---

### 问题：`listen tcp :3000: bind: address already in use`

**原因：** 端口 3000 已被占用

**解决方案：**

**Windows：**
```bash
# 查找占用端口的进程
netstat -ano | findstr :3000

# 杀死进程（替换 PID）
taskkill /PID <PID> /F

# 或修改端口（编辑 .env 文件）
PORT=8080
```

---

### 问题：`404 Not Found` 访问前端页面

**原因：** dist 目录未复制到 server-go

**解决方案：**

```bash
# 1. 构建前端
npm run build

# 2. 复制到 server-go
xcopy /e /i /y dist server-go\dist

# 3. 验证文件存在
dir server-go\dist\index.html
```

---

### 问题：前端调用 API 返回 401

**原因：** JWT token 无效或过期

**解决方案：**

```bash
# 1. 检查 JWT_SECRET 是否一致
# .env 文件中的 JWT_SECRET 必须与之前 Node.js 版本相同

# 2. 清除浏览器 localStorage
# 打开浏览器控制台
localStorage.clear()

# 3. 重新登录
```

---

### 问题：打包后的 .exe 文件过大（>15MB）

**原因：** 未启用优化

**解决方案：**

```bash
# 使用优化参数编译
go build -ldflags="-s -w" -o vue-element-ui.exe

# 使用 UPX 压缩
upx --best --lzma vue-element-ui.exe
```

---

## 快速诊断

运行环境检查脚本：

```bash
# Windows
check-env.bat

# Linux/Mac
chmod +x check-env.sh
./check-env.sh
```

---

## 获取帮助

如果以上方法都无法解决问题：

1. **查看完整错误日志**
   ```bash
   cd server-go
   go run main.go 2>&1 | tee error.log
   ```

2. **检查 Go 版本**
   ```bash
   go version  # 需要 1.21+
   ```

3. **重新开始**
   ```bash
   go clean -cache -modcache
   cd server-go
   go mod download
   go run main.go
   ```
