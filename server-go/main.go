package main

import (
	"embed"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"runtime/debug"
	"strconv"
	"time"
	"vue-element-ui/config"
	"vue-element-ui/db"
	"vue-element-ui/handlers"
	"vue-element-ui/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

//go:embed dist
var distFS embed.FS

func setupLogging() (*os.File, string, error) {
	logPath, err := resolveLogPath()
	if err != nil {
		return nil, "", err
	}

	if err := os.MkdirAll(filepath.Dir(logPath), 0755); err != nil {
		return nil, "", err
	}

	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, "", err
	}

	writer := io.MultiWriter(os.Stdout, logFile)
	log.SetOutput(writer)
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)
	gin.DefaultWriter = writer
	gin.DefaultErrorWriter = writer

	return logFile, logPath, nil
}

func resolveLogPath() (string, error) {
	if configDir, err := os.UserConfigDir(); err == nil {
		return filepath.Join(configDir, "VueElementUI", "logs", "server-go.log"), nil
	}

	if exePath, err := os.Executable(); err == nil {
		return filepath.Join(filepath.Dir(exePath), "logs", "server-go.log"), nil
	}

	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	return filepath.Join(wd, "logs", "server-go.log"), nil
}

func installPanicLogger() {
	if r := recover(); r != nil {
		log.Printf("panic: %v", r)
		log.Printf("stack trace:\n%s", debug.Stack())
		os.Exit(1)
	}
}

func logStartupContext(logPath string) {
	exePath, _ := os.Executable()
	workingDir, _ := os.Getwd()

	log.Printf("log file: %s", logPath)
	log.Printf("executable: %s", exePath)
	log.Printf("working directory: %s", workingDir)
	log.Printf("platform: %s/%s", runtime.GOOS, runtime.GOARCH)
}

func main() {
	defer installPanicLogger()

	logFile, logPath, err := setupLogging()
	if err != nil {
		log.Printf("failed to initialize log file: %v", err)
	} else {
		defer logFile.Close()
		logStartupContext(logPath)
	}

	config.LoadConfig()

	if err := db.Init(); err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})

		api.POST("/login", handlers.Login)

		auth := api.Group("")
		auth.Use(middleware.AuthMiddleware())
		{
			auth.GET("/user/info", handlers.GetUserInfo)

			users := auth.Group("/users")
			users.Use(middleware.PermissionMiddleware("users"))
			{
				users.GET("", handlers.GetUsers)
				users.POST("", handlers.AddUser)
				users.PUT("/:id", handlers.UpdateUser)
				users.DELETE("/:id", handlers.DeleteUser)
			}

			auth.POST("/chat", handlers.Chat)
			auth.POST("/ai/chat", handlers.ChatWithAI)

			auth.GET("/chat/history", handlers.GetChatHistory)
			auth.PUT("/chat/history", handlers.SaveChatHistory)
			auth.DELETE("/chat/history", handlers.ClearChatHistory)

			auth.GET("/ai/requests", middleware.AdminMiddleware(), handlers.GetAIRequests)
			auth.POST("/ai/requests", handlers.SubmitPermissionRequest)

			auth.POST("/balance/upload", handlers.UploadExcel)
			auth.POST("/excel/upload", handlers.UploadExcel)

			auth.GET("/permissions/requests", handlers.GetPermissionRequests)
			auth.POST("/permissions/request", handlers.SubmitPermissionRequest)
			auth.POST("/permissions/approve", middleware.AdminMiddleware(), handlers.ApprovePermissionRequest)
		}
	}

	distSubFS, err := fs.Sub(distFS, "dist")
	if err != nil {
		log.Fatalf("failed to load embedded dist: %v", err)
	}

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if path == "/" {
			path = "/index.html"
		}

		file, err := distSubFS.Open(path[1:])
		if err != nil {
			indexFile, err := distSubFS.Open("index.html")
			if err != nil {
				c.String(http.StatusNotFound, "404 Not Found")
				return
			}
			defer indexFile.Close()
			c.DataFromReader(http.StatusOK, -1, "text/html", indexFile, nil)
			return
		}
		defer file.Close()

		c.DataFromReader(http.StatusOK, -1, getContentType(path), file, nil)
	})

	startPort, _ := strconv.Atoi(config.AppConfig.Port)
	if startPort == 0 {
		startPort = 3000
	}

	const maxRetries = 20

	for i := 0; i < maxRetries; i++ {
		tryPort := startPort + i
		addr := fmt.Sprintf(":%d", tryPort)

		listener, err := net.Listen("tcp", addr)
		if err != nil {
			log.Printf("port %d is in use, trying next port", tryPort)
			continue
		}
		listener.Close()

		log.Printf("server started at http://localhost:%d", tryPort)
		log.Printf("api endpoint: http://localhost:%d/api", tryPort)
		log.Printf("frontend url: http://localhost:%d", tryPort)

		go func(port int) {
			time.Sleep(1 * time.Second)
			openBrowser(fmt.Sprintf("http://localhost:%d", port))
		}(tryPort)

		if err := r.Run(addr); err != nil {
			log.Fatalf("failed to start server: %v", err)
		}
		return
	}

	log.Fatalf("failed to find an available port in range %d-%d", startPort, startPort+maxRetries-1)
}

func openBrowser(url string) {
	var err error

	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("cmd", "/c", "start", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}

	if err != nil {
		log.Printf("failed to open browser automatically: %v", err)
		return
	}

	log.Printf("opened browser: %s", url)
}

func getContentType(path string) string {
	switch {
	case len(path) >= 5 && path[len(path)-5:] == ".html":
		return "text/html"
	case len(path) >= 4 && path[len(path)-4:] == ".css":
		return "text/css"
	case len(path) >= 3 && path[len(path)-3:] == ".js":
		return "application/javascript"
	case len(path) >= 4 && path[len(path)-4:] == ".png":
		return "image/png"
	case len(path) >= 4 && path[len(path)-4:] == ".jpg":
		return "image/jpeg"
	case len(path) >= 5 && path[len(path)-5:] == ".jpeg":
		return "image/jpeg"
	case len(path) >= 4 && path[len(path)-4:] == ".svg":
		return "image/svg+xml"
	case len(path) >= 4 && path[len(path)-4:] == ".ico":
		return "image/x-icon"
	case len(path) >= 5 && path[len(path)-5:] == ".json":
		return "application/json"
	case len(path) >= 5 && path[len(path)-5:] == ".woff":
		return "font/woff"
	case len(path) >= 6 && path[len(path)-6:] == ".woff2":
		return "font/woff2"
	case len(path) >= 4 && path[len(path)-4:] == ".ttf":
		return "font/ttf"
	default:
		return "application/octet-stream"
	}
}
