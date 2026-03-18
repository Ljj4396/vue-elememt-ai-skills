package handlers

import (
	"fmt"
	"net/http"
	"time"
	"vue-element-ui/db"
	"vue-element-ui/models"

	"github.com/gin-gonic/gin"
)

// GetPermissionRequests 获取权限申请列表
func GetPermissionRequests(c *gin.Context) {
	requests := db.GetPermissionRequests()

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: requests,
	})
}

// SubmitPermissionRequest 提交权限申请
func SubmitPermissionRequest(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	var req struct {
		Type   string `json:"type" binding:"required"`
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "参数错误",
		})
		return
	}

	// 创建权限申请
	permissionReq := models.PermissionRequest{
		ID:        generatePermissionID(),
		UserID:    u.ID,
		Username:  u.Username,
		Type:      req.Type,
		Reason:    req.Reason,
		Status:    "pending",
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
	}

	if err := db.AddPermissionRequest(permissionReq); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 500,
			Msg:  "提交申请失败",
		})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: permissionReq,
	})
}

// ApprovePermissionRequest 审批权限申请
func ApprovePermissionRequest(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	var req models.PermissionApprovalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "参数错误",
		})
		return
	}

	// 获取权限申请
	permissionReq := db.GetPermissionRequestByID(req.RequestID)
	if permissionReq == nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 404,
			Msg:  "权限申请不存在",
		})
		return
	}

	// 更新申请状态
	if req.Approved {
		permissionReq.Status = "approved"

		// 授予权限
		targetUser := db.GetUserByID(permissionReq.UserID)
		if targetUser != nil {
			// 确保 Permissions map 已初始化
			if targetUser.Permissions == nil {
				targetUser.Permissions = make(map[string]bool)
			}

			// 设置权限为 true
			targetUser.Permissions[permissionReq.Type] = true

			db.UpdateUser(*targetUser)
		}
	} else {
		permissionReq.Status = "rejected"
	}

	permissionReq.ReviewBy = u.Username
	permissionReq.ReviewAt = time.Now().Format("2006-01-02 15:04:05")

	if err := db.UpdatePermissionRequest(*permissionReq); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 500,
			Msg:  "更新申请状态失败",
		})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: permissionReq,
	})
}

// generatePermissionID 生成权限申请 ID
func generatePermissionID() string {
	return fmt.Sprintf("perm-%d", time.Now().UnixNano())
}
