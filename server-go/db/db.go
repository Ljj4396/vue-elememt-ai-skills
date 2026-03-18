package db

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"vue-element-ui/models"
)

var (
	database *models.Database
	mu       sync.RWMutex
	dbPath   = "./server/db.json"
)

func Init() error {
	mu.Lock()
	defer mu.Unlock()

	resolvedPath, exists, err := resolveDBPath()
	if err != nil {
		return fmt.Errorf("read db file failed: %v", err)
	}
	dbPath = resolvedPath
	log.Printf("using db file: %s", dbPath)

	if !exists {
		if err := initializeDB(dbPath); err != nil {
			return fmt.Errorf("initialize db file failed: %v", err)
		}
	}

	data, err := os.ReadFile(dbPath)
	if err != nil {
		return fmt.Errorf("read db file failed: %v", err)
	}

	database = &models.Database{}
	if err := json.Unmarshal(data, database); err != nil {
		return fmt.Errorf("parse db file failed: %v", err)
	}
	ensureDatabaseDefaults()

	return nil
}

func resolveDBPath() (string, bool, error) {
	candidates := []string{
		"./server/db.json",
		"../server/db.json",
		"../../server/db.json",
		"server/db.json",
	}

	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		candidates = append(candidates,
			filepath.Join(exeDir, "server", "db.json"),
			filepath.Join(exeDir, "..", "server", "db.json"),
		)
	}

	var userConfigPath string
	if configDir, err := os.UserConfigDir(); err == nil {
		userConfigPath = filepath.Join(configDir, "VueElementUI", "server", "db.json")
		candidates = append(candidates, userConfigPath)
	}

	seen := make(map[string]struct{}, len(candidates))
	checked := make([]string, 0, len(candidates))
	for _, p := range candidates {
		cleaned := filepath.Clean(p)
		if _, ok := seen[cleaned]; ok {
			continue
		}
		seen[cleaned] = struct{}{}
		checked = append(checked, cleaned)
		if _, err := os.Stat(cleaned); err == nil {
			return cleaned, true, nil
		}
	}

	if userConfigPath != "" {
		return filepath.Clean(userConfigPath), false, nil
	}

	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		return filepath.Join(exeDir, "server", "db.json"), false, nil
	}

	return "", false, fmt.Errorf("db file not found; checked paths: %s", strings.Join(checked, ", "))
}

func initializeDB(path string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}

	now := time.Now().UnixMilli()
	defaultDB := models.Database{
		Users: []models.User{
			{
				ID:       1,
				Username: "zhangsan",
				Password: "123456",
				Nickname: "管理员",
				Account:  "ZS001",
				IsAdmin:  true,
				Permissions: map[string]bool{
					"users": true,
					"ai":    true,
					"vip":   true,
				},
				CreatedAt:   now,
				AILastReset: time.Now().Format("2006-01-02"),
			},
			{
				ID:       2,
				Username: "lisi",
				Password: "123456",
				Nickname: "普通用户",
				Account:  "LS002",
				IsAdmin:  false,
				Permissions: map[string]bool{
					"users": false,
					"ai":    true,
					"vip":   false,
				},
				CreatedAt: now,
			},
		},
		AIRequests:         []models.AIRequest{},
		PermissionRequests: []models.PermissionRequest{},
		ChatHistory:        map[string]*models.ChatHistory{},
	}

	data, err := json.MarshalIndent(defaultDB, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

func ensureDatabaseDefaults() {
	if database.Users == nil {
		database.Users = []models.User{}
	}
	if database.AIRequests == nil {
		database.AIRequests = []models.AIRequest{}
	}
	if database.PermissionRequests == nil {
		database.PermissionRequests = []models.PermissionRequest{}
	}
	if database.ChatHistory == nil {
		database.ChatHistory = map[string]*models.ChatHistory{}
	}
}

func Save() error {
	mu.Lock()
	defer mu.Unlock()
	return saveLocked()
}

func saveLocked() error {
	data, err := json.MarshalIndent(database, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal db failed: %v", err)
	}

	tmpPath := dbPath + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		return fmt.Errorf("write tmp db failed: %v", err)
	}

	if err := os.Rename(tmpPath, dbPath); err != nil {
		return fmt.Errorf("replace db failed: %v", err)
	}

	return nil
}

func GetUserByUsername(username string) *models.User {
	mu.RLock()
	defer mu.RUnlock()

	for i := range database.Users {
		if database.Users[i].Username == username {
			return &database.Users[i]
		}
	}
	return nil
}

func GetUserByID(id int) *models.User {
	mu.RLock()
	defer mu.RUnlock()

	for i := range database.Users {
		if database.Users[i].ID == id {
			return &database.Users[i]
		}
	}
	return nil
}

func GetAllUsers() []models.User {
	mu.RLock()
	defer mu.RUnlock()
	return database.Users
}

func AddUser(user models.User) error {
	mu.Lock()
	defer mu.Unlock()

	maxID := 0
	for _, u := range database.Users {
		if u.ID > maxID {
			maxID = u.ID
		}
	}
	user.ID = maxID + 1

	database.Users = append(database.Users, user)
	return saveLocked()
}

func UpdateUser(user models.User) error {
	mu.Lock()
	defer mu.Unlock()

	for i := range database.Users {
		if database.Users[i].ID == user.ID {
			database.Users[i] = user
			return saveLocked()
		}
	}
	return fmt.Errorf("user not found")
}

func DeleteUser(id int) error {
	mu.Lock()
	defer mu.Unlock()

	for i := range database.Users {
		if database.Users[i].ID == id {
			database.Users = append(database.Users[:i], database.Users[i+1:]...)
			return saveLocked()
		}
	}
	return fmt.Errorf("user not found")
}

func AddAIRequest(req models.AIRequest) error {
	mu.Lock()
	defer mu.Unlock()

	database.AIRequests = append(database.AIRequests, req)
	return saveLocked()
}

func GetAIRequests() []models.AIRequest {
	mu.RLock()
	defer mu.RUnlock()
	return database.AIRequests
}

func AddPermissionRequest(req models.PermissionRequest) error {
	mu.Lock()
	defer mu.Unlock()

	database.PermissionRequests = append(database.PermissionRequests, req)
	return saveLocked()
}

func GetPermissionRequests() []models.PermissionRequest {
	mu.RLock()
	defer mu.RUnlock()
	return database.PermissionRequests
}

func UpdatePermissionRequest(req models.PermissionRequest) error {
	mu.Lock()
	defer mu.Unlock()

	for i := range database.PermissionRequests {
		if database.PermissionRequests[i].ID == req.ID {
			database.PermissionRequests[i] = req
			return saveLocked()
		}
	}
	return fmt.Errorf("permission request not found")
}

func GetPermissionRequestByID(id string) *models.PermissionRequest {
	mu.RLock()
	defer mu.RUnlock()

	for i := range database.PermissionRequests {
		if database.PermissionRequests[i].ID == id {
			return &database.PermissionRequests[i]
		}
	}
	return nil
}

func GetChatHistory(userID int) *models.ChatHistory {
	mu.RLock()
	defer mu.RUnlock()

	if database.ChatHistory == nil {
		return &models.ChatHistory{
			ActiveID:      "",
			Conversations: []interface{}{},
			UpdatedAt:     0,
		}
	}

	key := fmt.Sprintf("%d", userID)
	if history, ok := database.ChatHistory[key]; ok {
		return history
	}

	return &models.ChatHistory{
		ActiveID:      "",
		Conversations: []interface{}{},
		UpdatedAt:     0,
	}
}

func SaveChatHistory(userID int, history *models.ChatHistory) error {
	mu.Lock()
	defer mu.Unlock()

	if database.ChatHistory == nil {
		database.ChatHistory = make(map[string]*models.ChatHistory)
	}

	key := fmt.Sprintf("%d", userID)
	database.ChatHistory[key] = history

	return saveLocked()
}

func ClearChatHistory(userID int) error {
	mu.Lock()
	defer mu.Unlock()

	if database.ChatHistory == nil {
		database.ChatHistory = make(map[string]*models.ChatHistory)
	}

	key := fmt.Sprintf("%d", userID)
	database.ChatHistory[key] = &models.ChatHistory{
		ActiveID:      "",
		Conversations: []interface{}{},
		UpdatedAt:     time.Now().UnixMilli(),
	}

	return saveLocked()
}
