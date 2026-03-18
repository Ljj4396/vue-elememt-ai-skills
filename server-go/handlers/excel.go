package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"vue-element-ui/models"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

// UploadExcel 上传并解析 Excel 文件
func UploadExcel(c *gin.Context) {
	// 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "未找到上传文件",
		})
		return
	}

	// 检查文件扩展名
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".xlsx" && ext != ".xls" {
		c.JSON(http.StatusOK, models.Response{
			Code: 400,
			Msg:  "仅支持 .xlsx 和 .xls 格式",
		})
		return
	}

	// 保存临时文件
	tempPath := filepath.Join("../server", "temp_"+file.Filename)
	if err := c.SaveUploadedFile(file, tempPath); err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 500,
			Msg:  "保存文件失败",
		})
		return
	}

	// 解析 Excel
	balanceSheet, err := parseExcel(tempPath)
	if err != nil {
		c.JSON(http.StatusOK, models.Response{
			Code: 500,
			Msg:  fmt.Sprintf("解析 Excel 失败: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, models.Response{
		Code: 0,
		Data: balanceSheet,
	})
}

// parseExcel 解析 Excel 文件
func parseExcel(filePath string) (*models.BalanceSheet, error) {
	// 打开 Excel 文件
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	// 获取第一个工作表
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("Excel 文件中没有工作表")
	}

	sheetName := sheets[0]
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, err
	}

	if len(rows) == 0 {
		return nil, fmt.Errorf("工作表为空")
	}

	// 第一行作为表头
	headers := rows[0]

	// 解析数据行
	var dataRows [][]interface{}
	var debitTotal, creditTotal float64

	for i := 1; i < len(rows); i++ {
		row := rows[i]
		if len(row) == 0 {
			continue
		}

		// 转换为 interface{} 数组
		dataRow := make([]interface{}, len(headers))
		for j := 0; j < len(headers) && j < len(row); j++ {
			// 尝试转换为数字
			if val, err := strconv.ParseFloat(row[j], 64); err == nil {
				dataRow[j] = val

				// 识别借贷列（简单规则：包含"借"或"贷"关键字）
				headerLower := strings.ToLower(headers[j])
				if strings.Contains(headerLower, "借") || strings.Contains(headerLower, "debit") {
					debitTotal += val
				} else if strings.Contains(headerLower, "贷") || strings.Contains(headerLower, "credit") {
					creditTotal += val
				}
			} else {
				dataRow[j] = row[j]
			}
		}
		dataRows = append(dataRows, dataRow)
	}

	// 计算余额
	balance := debitTotal - creditTotal

	// 构建汇总信息
	summary := map[string]string{
		"借方合计": fmt.Sprintf("%.2f", debitTotal),
		"贷方合计": fmt.Sprintf("%.2f", creditTotal),
		"余额":   fmt.Sprintf("%.2f", balance),
		"记录数":  fmt.Sprintf("%d", len(dataRows)),
	}

	return &models.BalanceSheet{
		Headers: headers,
		Rows:    dataRows,
		Summary: summary,
	}, nil
}
