package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
	"vue-element-ui/config"
	"vue-element-ui/db"
	"vue-element-ui/models"

	"github.com/gin-gonic/gin"
)

const AI_DAILY_LIMIT = 10

// ChatWithAI AI 聊天处理
func ChatWithAI(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	var req models.AIChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "参数错误",
		})
		return
	}

	// 重置每日使用次数（如果需要）
	u.ResetAIUsageIfNeeded()

	// 检查使用次数限制（VIP 和管理员无限制）
	if !u.IsVIP() && !u.IsAdmin && u.AIUsageCount >= AI_DAILY_LIMIT {
		c.JSON(http.StatusOK, models.Response{
			Code: 429,
			Msg:  "今日使用次数已达上限",
		})
		return
	}

	// 生成会话 ID
	conversationID := req.ConversationID
	if conversationID == "" {
		conversationID = generateUUID()
	}

	// 调用 AI API
	response, err := callAIAPI(req.Message, req.Images)
	if err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 500,
			Msg:  fmt.Sprintf("AI 服务调用失败: %v", err),
		})
		return
	}

	// 更新使用次数
	if !u.IsVIP() && !u.IsAdmin {
		u.AIUsageCount++
		db.UpdateUser(*u)
	}

	// 保存请求记录
	aiRequest := models.AIRequest{
		ID:             generateUUID(),
		UserID:         u.ID,
		Username:       u.Username,
		ConversationID: conversationID,
		Messages: []models.AIMessage{
			{Role: "user", Content: req.Message},
		},
		Response:  response,
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		Model:     config.AppConfig.AIModel,
	}
	db.AddAIRequest(aiRequest)

	// 计算剩余次数
	remainingCount := AI_DAILY_LIMIT - u.AIUsageCount
	if u.IsVIP() || u.IsAdmin {
		remainingCount = -1 // -1 表示无限制
	}

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: models.AIChatResponse{
			Response:       response,
			ConversationID: conversationID,
			RemainingCount: remainingCount,
		},
	})
}

// callAIAPI 调用 AI API
func callAIAPI(message string, images []string) (string, error) {
	provider := config.AppConfig.AIProvider
	baseURL := config.AppConfig.AIBaseURL
	apiKey := config.AppConfig.AIAPIKey
	model := config.AppConfig.AIModel

	if apiKey == "" || baseURL == "" {
		return "", fmt.Errorf("AI 配置未设置")
	}

	// 构建请求体
	var requestBody map[string]interface{}

	if provider == "codex" {
		// Codex API 格式
		requestBody = map[string]interface{}{
			"model": model,
			"input": message,
		}
		if len(images) > 0 {
			requestBody["images"] = images
		}
	} else {
		// Claude API 格式（默认）
		messages := []map[string]interface{}{
			{
				"role":    "user",
				"content": message,
			},
		}
		requestBody = map[string]interface{}{
			"model":    model,
			"messages": messages,
		}
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", err
	}

	// 确定 API 端点
	endpoint := baseURL
	if provider == "codex" {
		endpoint += "/responses"
	} else {
		endpoint += "/chat/completions"
	}

	// 创建 HTTP 请求
	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	// 发送请求
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("AI API 返回错误: %s", string(body))
	}

	// 解析响应
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	// 提取响应内容
	var content string
	if provider == "codex" {
		if data, ok := result["data"].(map[string]interface{}); ok {
			if text, ok := data["text"].(string); ok {
				content = text
			}
		}
	} else {
		// Claude 格式
		if choices, ok := result["choices"].([]interface{}); ok && len(choices) > 0 {
			if choice, ok := choices[0].(map[string]interface{}); ok {
				if msg, ok := choice["message"].(map[string]interface{}); ok {
					if text, ok := msg["content"].(string); ok {
						content = text
					}
				}
			}
		}
	}

	if content == "" {
		return "", fmt.Errorf("无法解析 AI 响应")
	}

	return content, nil
}

// GetAIRequests 获取 AI 请求记录
func GetAIRequests(c *gin.Context) {
	requests := db.GetAIRequests()

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: requests,
	})
}

// generateUUID 生成 UUID（简单实现）
func generateUUID() string {
	return fmt.Sprintf("%d-%d", time.Now().UnixNano(), time.Now().Unix())
}
