package models

import "time"

// User 用户模型
type User struct {
	ID            int               `json:"id"`
	Username      string            `json:"username"`
	Password      string            `json:"password"`
	Nickname      string            `json:"nickname"`
	Account       string            `json:"account"`
	Phone         string            `json:"phone"`
	Email         string            `json:"email"`
	IsAdmin       bool              `json:"isAdmin"`
	Permissions   map[string]bool   `json:"permissions"`
	CreatedAt     int64             `json:"createdAt"`
	UpdatedAt     int64             `json:"updatedAt,omitempty"`
	AIUsageCount  int               `json:"aiUsageCount,omitempty"`
	AILastReset   string            `json:"aiLastReset,omitempty"`
}

// UserInfo 用户信息（不包含密码）
type UserInfo struct {
	ID           int             `json:"id"`
	Username     string          `json:"username"`
	Nickname     string          `json:"nickname"`
	Account      string          `json:"account"`
	Phone        string          `json:"phone"`
	Email        string          `json:"email"`
	IsAdmin      bool            `json:"isAdmin"`
	Permissions  map[string]bool `json:"permissions"`
	AIUsageCount int             `json:"aiUsageCount,omitempty"`
}

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	Token    string   `json:"token"`
	User     UserInfo `json:"user"`
}

// AIMessage AI 消息
type AIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// AIRequest AI 请求记录
type AIRequest struct {
	ID             string      `json:"id"`
	UserID         int         `json:"userId"`
	Username       string      `json:"username"`
	ConversationID string      `json:"conversationId"`
	Messages       []AIMessage `json:"messages"`
	Response       string      `json:"response"`
	Timestamp      string      `json:"timestamp"`
	Model          string      `json:"model"`
	TokensUsed     int         `json:"tokensUsed"`
}

// AIChatRequest AI 聊天请求
type AIChatRequest struct {
	Message        string   `json:"message" binding:"required"`
	ConversationID string   `json:"conversationId"`
	Images         []string `json:"images"`
}

// AIChatResponse AI 聊天响应
type AIChatResponse struct {
	Response       string `json:"response"`
	ConversationID string `json:"conversationId"`
	RemainingCount int    `json:"remainingCount"`
}

// PermissionRequest 权限申请
type PermissionRequest struct {
	ID        string `json:"id"`
	UserID    int    `json:"userId"`
	Username  string `json:"username"`
	Type      string `json:"type"`
	Reason    string `json:"reason"`
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	ReviewBy  string `json:"reviewBy,omitempty"`
	ReviewAt  string `json:"reviewAt,omitempty"`
}

// PermissionApprovalRequest 权限审批请求
type PermissionApprovalRequest struct {
	RequestID string `json:"requestId" binding:"required"`
	Approved  bool   `json:"approved"`
}

// BalanceSheet 余额表
type BalanceSheet struct {
	Headers []string          `json:"headers"`
	Rows    [][]interface{}   `json:"rows"`
	Summary map[string]string `json:"summary"`
}

// ChatHistory 聊天历史
type ChatHistory struct {
	ActiveID      string         `json:"activeId"`
	Conversations []interface{}  `json:"conversations"`
	UpdatedAt     int64          `json:"updatedAt"`
}

// ChatHistoryRequest 聊天历史请求
type ChatHistoryRequest struct {
	ActiveID      string        `json:"activeId"`
	Conversations []interface{} `json:"conversations"`
}

// Database 数据库结构
type Database struct {
	Users              []User                  `json:"users"`
	AIRequests         []AIRequest             `json:"aiRequests,omitempty"`
	PermissionRequests []PermissionRequest     `json:"permissionRequests,omitempty"`
	ChatHistory        map[string]*ChatHistory `json:"chatHistory,omitempty"`
}

// Response 统一响应格式
type Response struct {
	Code int         `json:"code"`
	Data interface{} `json:"data,omitempty"`
	Msg  string      `json:"msg,omitempty"`
}

// ToUserInfo 将 User 转换为 UserInfo（移除密码）
func (u *User) ToUserInfo() UserInfo {
	return UserInfo{
		ID:           u.ID,
		Username:     u.Username,
		Nickname:     u.Nickname,
		Account:      u.Account,
		Phone:        u.Phone,
		Email:        u.Email,
		IsAdmin:      u.IsAdmin,
		Permissions:  u.Permissions,
		AIUsageCount: u.AIUsageCount,
	}
}

// ResetAIUsageIfNeeded 如果需要，重置 AI 使用次数
func (u *User) ResetAIUsageIfNeeded() {
	now := time.Now().Format("2006-01-02")
	if u.AILastReset != now {
		u.AIUsageCount = 0
		u.AILastReset = now
	}
}

// HasPermission 检查用户是否拥有指定权限
func (u *User) HasPermission(permission string) bool {
	if u.IsAdmin {
		return true
	}
	if u.Permissions == nil {
		return false
	}
	return u.Permissions[permission]
}

// IsVIP 检查用户是否是 VIP
func (u *User) IsVIP() bool {
	if u.IsAdmin {
		return true
	}
	if u.Permissions == nil {
		return false
	}
	return u.Permissions["vip"]
}
