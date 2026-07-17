# OCR 服务配置指南

## 方案：百度 OCR API

### 1. 获取 API Key

1. 访问 https://ai.baidu.com/tech/ocr
2. 注册百度账号并登录
3. 创建应用，获取 **API Key** 和 **Secret Key**

### 2. 设置环境变量

```powershell
# Windows PowerShell
$env:BAIDU_OCR_API_KEY = "你的API_KEY"
$env:BAIDU_OCR_SECRET_KEY = "你的SECRET_KEY"

# 或者永久设置
[Environment]::SetEnvironmentVariable("BAIDU_OCR_API_KEY", "你的API_KEY", "User")
[Environment]::SetEnvironmentVariable("BAIDU_OCR_SECRET_KEY", "你的SECRET_KEY", "User")
```

### 3. 安装依赖

```powershell
pip install requests Pillow
```

### 4. 测试

```powershell
python scripts/ocr-service/ocr_api.py "https://img.boqiicdn.com/xxx.jpg"
```

## 免费额度

百度 OCR API 提供：
- **通用文字识别**：每月 50,000 次免费
- **精度要求更高**：每月 500 次免费（高精度版）

## 集成到爬虫

在 `src/ocr.ts` 中配置 API 地址即可。
