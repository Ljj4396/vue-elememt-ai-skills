# 安装 Go 详细步骤（Windows）

## 方式 1：官方安装包（推荐）

### 1. 下载 Go

访问官方下载页面：https://go.dev/dl/

找到 Windows 版本，下载 `.msi` 安装包：
- **文件名**：`go1.21.x.windows-amd64.msi`
- **大小**：约 130MB

### 2. 安装 Go

1. 双击下载的 `.msi` 文件
2. 点击 "Next"
3. 接受许可协议
4. 选择安装路径（默认：`C:\Program Files\Go`）
5. 点击 "Install"
6. 等待安装完成（约 1 分钟）
7. 点击 "Finish"

### 3. 验证安装

打开命令提示符（Win + R，输入 `cmd`），输入：

```bash
go version
```

应该看到类似输出：
```
go version go1.21.5 windows/amd64
```

### 4. 配置环境变量（通常自动配置）

如果 `go version` 命令无效，手动配置：

1. 右键"此电脑" → "属性"
2. 点击"高级系统设置"
3. 点击"环境变量"
4. 在"系统变量"中找到 `Path`，点击"编辑"
5. 添加：`C:\Program Files\Go\bin`
6. 点击"确定"
7. 重启命令提示符

---

## 方式 2：使用 Chocolatey（高级用户）

如果你已安装 Chocolatey 包管理器：

```bash
choco install golang
```

---

## 方式 3：便携版（无需安装）

1. 下载 `.zip` 版本：https://go.dev/dl/
2. 解压到任意目录（如 `D:\go`）
3. 添加到 PATH：`D:\go\bin`

---

## 配置 Go 工作区（可选）

Go 1.11+ 使用 Go Modules，无需配置 GOPATH。但如果需要：

```bash
# 设置 GOPATH（可选）
setx GOPATH "%USERPROFILE%\go"

# 设置代理（国内用户推荐）
go env -w GOPROXY=https://goproxy.cn,direct
```

---

## 验证安装完整性

```bash
# 查看 Go 版本
go version

# 查看 Go 环境
go env

# 测试编译
echo package main > test.go
echo import "fmt" >> test.go
echo func main() { fmt.Println("Hello Go") } >> test.go
go run test.go
```

应该输出：`Hello Go`

---

## 常见问题

### Q1: go: command not found

**原因**：Go 未添加到 PATH

**解决**：
1. 检查安装路径：`C:\Program Files\Go\bin`
2. 手动添加到 PATH（见上方步骤 4）
3. 重启命令提示符

---

### Q2: 下载速度慢

**原因**：国内网络限制

**解决**：使用国内镜像
```bash
go env -w GOPROXY=https://goproxy.cn,direct
```

---

### Q3: 权限不足

**原因**：安装到系统目录需要管理员权限

**解决**：
1. 右键安装包 → "以管理员身份运行"
2. 或安装到用户目录（如 `C:\Users\你的用户名\go`）

---

## 下一步

安装完成后，返回主文档继续：
```bash
cd server-go
go mod download
```

---

## 卸载 Go

如果需要卸载：

1. 控制面板 → 程序和功能
2. 找到 "Go Programming Language"
3. 右键 → 卸载

或手动删除：
- 删除 `C:\Program Files\Go`
- 从 PATH 中移除 Go 路径
