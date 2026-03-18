package middleware

import (
	"net/http"
	"strings"
	"vue-element-ui/db"
	"vue-element-ui/models"
	"vue-element-ui/utils"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware JWT 认证中间件
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取 Authorization 头
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusOK, models.Response{
				Code: 401,
				Msg:  "未提供认证令牌",
			})
			c.Abort()
			return
		}

		// 解析 Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusOK, models.Response{
				Code: 401,
				Msg:  "认证令牌格式错误",
			})
			c.Abort()
			return
		}

		// 验证 token
		claims, err := utils.ParseToken(parts[1])
		if err != nil {
			c.JSON(http.StatusOK, models.Response{
				Code: 401,
				Msg:  "认证令牌无效或已过期",
			})
			c.Abort()
			return
		}

		// 获取用户信息
		user := db.GetUserByID(claims.UserID)
		if user == nil {
			c.JSON(http.StatusOK, models.Response{
				Code: 401,
				Msg:  "用户不存在",
			})
			c.Abort()
			return
		}

		// 将用户信息存入上下文
		c.Set("user", user)
		c.Set("userId", claims.UserID)
		c.Set("username", claims.Username)

		c.Next()
	}
}

// AdminMiddleware 管理员权限中间件
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusOK, models.Response{
				Code: 403,
				Msg:  "需要管理员权限",
			})
			c.Abort()
			return
		}

		u := user.(*models.User)
		if !u.IsAdmin {
			c.JSON(http.StatusOK, models.Response{
				Code: 403,
				Msg:  "需要管理员权限",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// PermissionMiddleware 权限检查中间件
func PermissionMiddleware(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusOK, models.Response{
				Code: 403,
				Msg:  "需要相应权限",
			})
			c.Abort()
			return
		}

		u := user.(*models.User)

		// 使用 HasPermission 方法检查权限
		if !u.HasPermission(permission) {
			c.JSON(http.StatusOK, models.Response{
				Code: 403,
				Msg:  "需要相应权限",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
