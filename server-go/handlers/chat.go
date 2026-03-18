package handlers

import (
	"fmt"
	"net/http"
	"time"
	"vue-element-ui/db"
	"vue-element-ui/models"

	"github.com/gin-gonic/gin"
)

// GetChatHistory 获取聊天历史
func GetChatHistory(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	history := db.GetChatHistory(u.ID)

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: history,
	})
}

// SaveChatHistory 保存聊天历史
func SaveChatHistory(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	var req models.ChatHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "参数错误",
		})
		return
	}

	history := &models.ChatHistory{
		ActiveID:      req.ActiveID,
		Conversations: req.Conversations,
		UpdatedAt:     time.Now().UnixMilli(),
	}

	if err := db.SaveChatHistory(u.ID, history); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 500,
			Msg:  fmt.Sprintf("保存失败: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: history,
	})
}

// ClearChatHistory 清空聊天历史
func ClearChatHistory(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	if err := db.ClearChatHistory(u.ID); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 500,
			Msg:  fmt.Sprintf("清空失败: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: &models.ChatHistory{
			ActiveID:      "",
			Conversations: []interface{}{},
			UpdatedAt:     time.Now().UnixMilli(),
		},
	})
}
