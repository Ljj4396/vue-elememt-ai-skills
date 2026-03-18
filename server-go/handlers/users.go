package handlers

import (
	"fmt"
	"net/http"
	"time"
	"vue-element-ui/db"
	"vue-element-ui/models"

	"github.com/gin-gonic/gin"
)

// GetUsers 获取用户列表
func GetUsers(c *gin.Context) {
	users := db.GetAllUsers()

	// 转换为 UserInfo（移除密码）
	userInfos := make([]models.UserInfo, len(users))
	for i, user := range users {
		userInfos[i] = user.ToUserInfo()
	}

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: userInfos,
	})
}

// AddUser 添加用户
func AddUser(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "参数错误",
		})
		return
	}

	// 检查用户名是否已存在
	if db.GetUserByUsername(user.Username) != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "用户名已存在",
		})
		return
	}

	// 设置默认值
	user.AIUsageCount = 0
	user.AILastReset = time.Now().Format("2006-01-02")
	user.CreatedAt = time.Now().UnixMilli()

	// 初始化 permissions map（如果为空）
	if user.Permissions == nil {
		user.Permissions = make(map[string]bool)
		user.Permissions["users"] = false
		user.Permissions["ai"] = false
		user.Permissions["vip"] = false
	}

	// 添加用户
	if err := db.AddUser(user); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 500,
			Msg:  "添加用户失败",
		})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: user.ToUserInfo(),
	})
}

// UpdateUser 更新用户
func UpdateUser(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "参数错误",
		})
		return
	}

	// 检查用户是否存在
	existingUser := db.GetUserByID(user.ID)
	if existingUser == nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 404,
			Msg:  "用户不存在",
		})
		return
	}

	// 更新时间戳
	user.UpdatedAt = time.Now().UnixMilli()

	// 更新用户
	if err := db.UpdateUser(user); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 500,
			Msg:  "更新用户失败",
		})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: user.ToUserInfo(),
	})
}

// DeleteUser 删除用户
func DeleteUser(c *gin.Context) {
	id := c.Param("id")

	// 解析 ID
	var userID int
	if _, err := fmt.Sscanf(id, "%d", &userID); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "无效的用户 ID",
		})
		return
	}

	// 检查用户是否存在
	if db.GetUserByID(userID) == nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 404,
			Msg:  "用户不存在",
		})
		return
	}

	// 删除用户
	if err := db.DeleteUser(userID); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 500,
			Msg:  "删除用户失败",
		})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: gin.H{"message": "删除成功"},
	})
}
