package config

import (
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
)

const defaultConfigTemplate = `# Vue Element UI runtime config
# This file is created automatically next to the executable.
# Update the AI fields below, save the file, and restart the exe.

PORT=3001
JWT_SECRET=your-super-secret-key-change-in-production

# AI provider: codex or claude
AI_PROVIDER=codex

# Example:
# AI_BASE_URL=https://api.openai.com/v1
AI_BASE_URL=

# Example:
# AI_MODEL=gpt-5.4
AI_MODEL=

# Your API key
AI_API_KEY=
`

type Config struct {
	Port       string
	JWTSecret  string
	AIAPIKey   string
	AIBaseURL  string
	AIModel    string
	AIProvider string
	ConfigPath string
}

var AppConfig *Config

func LoadConfig() {
	configPath, created, err := ensureEditableConfigFile()
	if err != nil {
		log.Printf("failed to prepare editable config file: %v", err)
	}
	if created {
		log.Printf("created editable config file: %s", configPath)
	}

	values, loadedPath := loadConfigValues(configPath)
	AppConfig = &Config{
		Port:       getConfigValue("PORT", "3001", values),
		JWTSecret:  getConfigValue("JWT_SECRET", "your-super-secret-key-change-in-production", values),
		AIAPIKey:   getConfigValue("AI_API_KEY", "", values),
		AIBaseURL:  getConfigValue("AI_BASE_URL", "", values),
		AIModel:    getConfigValue("AI_MODEL", "", values),
		AIProvider: getConfigValue("AI_PROVIDER", "codex", values),
		ConfigPath: configPath,
	}

	if loadedPath != "" {
		log.Printf("loaded config file: %s", loadedPath)
	} else if configPath != "" {
		log.Printf("editable config file is available at: %s", configPath)
	}

	log.Printf(
		"config loaded: Port=%s, AIProvider=%s, AIBaseURL=%s, AIModel=%s",
		AppConfig.Port,
		AppConfig.AIProvider,
		AppConfig.AIBaseURL,
		AppConfig.AIModel,
	)

	if AppConfig.AIAPIKey == "" || AppConfig.AIBaseURL == "" || AppConfig.AIModel == "" {
		log.Printf("warning: AI config is incomplete; update %s and restart the exe", AppConfig.ConfigPath)
	}
}

func ensureEditableConfigFile() (string, bool, error) {
	configPath, err := editableConfigPath()
	if err != nil {
		return "", false, err
	}

	if _, err := os.Stat(configPath); err == nil {
		return configPath, false, nil
	} else if !os.IsNotExist(err) {
		return configPath, false, err
	}

	if err := os.MkdirAll(filepath.Dir(configPath), 0755); err != nil {
		return configPath, false, err
	}

	if err := os.WriteFile(configPath, []byte(defaultConfigTemplate), 0644); err != nil {
		return configPath, false, err
	}

	return configPath, true, nil
}

func editableConfigPath() (string, error) {
	if exePath, err := os.Executable(); err == nil {
		return filepath.Join(filepath.Dir(exePath), "config.env"), nil
	}

	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	return filepath.Join(wd, "config.env"), nil
}

func loadConfigValues(primaryPath string) (map[string]string, string) {
	candidates := make([]string, 0, 6)
	if primaryPath != "" {
		candidates = append(candidates, primaryPath)
	}

	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		candidates = append(candidates, filepath.Join(exeDir, ".env"))
	}

	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates,
			filepath.Join(wd, "config.env"),
			filepath.Join(wd, ".env"),
			filepath.Join(wd, "..", ".env"),
			filepath.Join(wd, "..", "..", ".env"),
		)
	}

	seen := make(map[string]struct{}, len(candidates))
	for _, path := range candidates {
		cleaned := filepath.Clean(path)
		if _, ok := seen[cleaned]; ok {
			continue
		}
		seen[cleaned] = struct{}{}

		file, err := os.Open(cleaned)
		if err != nil {
			continue
		}

		values, parseErr := godotenv.Parse(file)
		file.Close()
		if parseErr != nil {
			log.Printf("failed to parse config file %s: %v", cleaned, parseErr)
			continue
		}

		return values, cleaned
	}

	return nil, ""
}

func getConfigValue(key, fallback string, fileValues map[string]string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	if fileValues != nil {
		if value := strings.TrimSpace(fileValues[key]); value != "" {
			return value
		}
	}
	return fallback
}
