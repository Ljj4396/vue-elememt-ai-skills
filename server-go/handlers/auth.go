package handlers

import (
	"net/http"
	"vue-element-ui/db"
	"vue-element-ui/models"
	"vue-element-ui/utils"

	"github.com/gin-gonic/gin"
)

// Login 用户登录
func Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "参数错误",
		})
		return
	}

	// 查找用户
	user := db.GetUserByUsername(req.Username)
	if user == nil || user.Password != req.Password {
		c.JSON(http.StatusOK, models.Response{
			Code: 401,
			Msg:  "用户名或密码错误",
		})
		return
	}

	// 生成 token
	token, err := utils.GenerateToken(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 500,
			Msg:  "生成令牌失败",
		})
		return
	}

	// 返回登录信息
	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: models.LoginResponse{
			Token: token,
			User:  user.ToUserInfo(),
		},
	})
}

// GetUserInfo 获取当前用户信息
func GetUserInfo(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: u.ToUserInfo(),
	})
}
