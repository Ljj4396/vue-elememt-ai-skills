package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
	"vue-element-ui/config"
	"vue-element-ui/db"
	"vue-element-ui/models"

	"github.com/gin-gonic/gin"
)

const AI_CHAT_DAILY_LIMIT = 10

type ChatMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"`
}

type ChatRequest struct {
	Messages []ChatMessage `json:"messages"`
}

type ChatResponse struct {
	Content string `json:"content"`
}

func Chat(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "参数错误",
		})
		log.Printf("[Chat] invalid request payload from user=%s: %v", u.Username, err)
		return
	}

	log.Printf("[Chat] received request from user=%s, messages=%d", u.Username, len(req.Messages))

	if len(req.Messages) == 0 {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "messages 格式错误",
		})
		return
	}

	u.ResetAIUsageIfNeeded()

	if !u.IsVIP() && !u.IsAdmin && u.AIUsageCount >= AI_CHAT_DAILY_LIMIT {
		c.JSON(http.StatusOK, models.Response{
			Code: 42901,
			Msg:  "今日提问次数已达上限，请申请 VIP 权限",
			Data: map[string]interface{}{
				"limit": AI_CHAT_DAILY_LIMIT,
				"count": u.AIUsageCount,
			},
		})
		return
	}

	content, err := callChatAPI(req.Messages)
	if err != nil {
		log.Printf("AI service call failed: %v", err)
		c.JSON(http.StatusOK, models.Response{
			Code: 500,
			Msg:  fmt.Sprintf("AI 服务调用失败: %v", err),
		})
		return
	}

	if !u.IsVIP() && !u.IsAdmin {
		u.AIUsageCount++
		_ = db.UpdateUser(*u)
	}

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: ChatResponse{
			Content: content,
		},
	})
}

func callChatAPI(messages []ChatMessage) (string, error) {
	provider := config.AppConfig.AIProvider
	baseURL := strings.TrimRight(config.AppConfig.AIBaseURL, "/")
	apiKey := config.AppConfig.AIAPIKey
	model := config.AppConfig.AIModel

	log.Printf("AI config: provider=%s, baseURL=%s, model=%s", provider, baseURL, model)

	if apiKey == "" || baseURL == "" || model == "" {
		return "", fmt.Errorf("AI 配置未完成，请编辑 %s 后重新启动程序", config.AppConfig.ConfigPath)
	}

	mappedMessages := make([]map[string]interface{}, len(messages))
	for i, msg := range messages {
		mappedMessages[i] = map[string]interface{}{
			"role":    msg.Role,
			"content": msg.Content,
		}
	}

	var requestBody map[string]interface{}
	var endpoint string

	if provider == "codex" {
		requestBody = map[string]interface{}{
			"model":  model,
			"input":  mappedMessages,
			"stream": false,
		}
		endpoint = baseURL + "/responses"
	} else {
		requestBody = map[string]interface{}{
			"model":    model,
			"messages": mappedMessages,
			"stream":   false,
		}
		endpoint = baseURL + "/chat/completions"
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", err
	}

	log.Printf("AI endpoint: %s", endpoint)

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("连接 AI 服务失败: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	log.Printf("AI response status: %d", resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		log.Printf("AI error response: %s", string(body))
		return "", fmt.Errorf("AI API 返回错误 (状态码 %d): %s", resp.StatusCode, string(body))
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType != "" && !strings.Contains(contentType, "application/json") {
		log.Printf("AI returned non-JSON response: Content-Type=%s", contentType)
		return "", fmt.Errorf("AI API 返回非 JSON 响应: %s", contentType)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		log.Printf("failed to parse AI response: %v, body=%s", err, string(body[:min(500, len(body))]))
		return "", fmt.Errorf("解析 AI 响应失败: %v", err)
	}

	var content string
	if provider == "codex" {
		content = extractCodexContent(result)
	} else {
		content = extractChatCompletionContent(result)
	}

	if content == "" {
		log.Printf("failed to extract AI content from response: %s", string(body[:min(1000, len(body))]))
		return "", fmt.Errorf("无法从 AI 响应中提取内容")
	}

	log.Printf("AI content extracted successfully, length=%d", len(content))
	return content, nil
}

func extractCodexContent(result map[string]interface{}) string {
	output, ok := result["output"].([]interface{})
	if !ok {
		return ""
	}

	var builder strings.Builder
	for _, item := range output {
		itemMap, ok := item.(map[string]interface{})
		if !ok || itemMap["type"] != "message" {
			continue
		}

		contentArray, ok := itemMap["content"].([]interface{})
		if !ok {
			continue
		}

		for _, entry := range contentArray {
			entryMap, ok := entry.(map[string]interface{})
			if !ok {
				continue
			}
			if text, ok := entryMap["text"].(string); ok {
				builder.WriteString(text)
			}
		}
	}

	return builder.String()
}

func extractChatCompletionContent(result map[string]interface{}) string {
	choices, ok := result["choices"].([]interface{})
	if !ok || len(choices) == 0 {
		return ""
	}

	choice, ok := choices[0].(map[string]interface{})
	if !ok {
		return ""
	}

	msg, ok := choice["message"].(map[string]interface{})
	if !ok {
		return ""
	}

	text, _ := msg["content"].(string)
	return text
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
