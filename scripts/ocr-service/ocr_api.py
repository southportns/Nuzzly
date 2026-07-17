import sys
import json
import re
import requests
import base64
from io import BytesIO
from PIL import Image

def ocr_recognize(image_path, api_key=None):
    """
    使用百度 OCR API 识别图片文字
    
    获取 API Key:
    1. 访问 https://ai.baidu.com/tech/ocr
    2. 注册并创建应用
    3. 获取 API Key 和 Secret Key
    4. 设置环境变量: BAIDU_OCR_API_KEY 和 BAIDU_OCR_SECRET_KEY
    """
    if api_key:
        access_token = get_access_token(api_key)
    else:
        api_key = os.environ.get('BAIDU_OCR_API_KEY')
        secret_key = os.environ.get('BAIDU_OCR_SECRET_KEY')
        if not api_key or not secret_key:
            return {"error": "请设置 BAIDU_OCR_API_KEY 和 BAIDU_OCR_SECRET_KEY 环境变量"}
        access_token = get_access_token(api_key, secret_key)
    
    if not access_token:
        return {"error": "获取 access_token 失败"}
    
    if image_path.startswith('http'):
        response = requests.get(image_path, timeout=10)
        image_data = base64.b64encode(response.content).decode('utf-8')
    else:
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
    
    url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token={access_token}"
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    data = {'image': image_data}
    
    response = requests.post(url, headers=headers, data=data)
    result = response.json()
    
    if 'words_result' not in result:
        return {"error": result.get('error_msg', '识别失败')}
    
    texts = [item['words'] for item in result['words_result']]
    full_text = "\n".join(texts)
    
    ingredients = extract_ingredients(full_text)
    nutrition = extract_nutrition(full_text)
    
    return {
        "texts": texts,
        "full_text": full_text,
        "ingredients": ingredients,
        "nutrition": nutrition
    }

def get_access_token(api_key, secret_key=None):
    if secret_key is None:
        secret_key = api_key
    
    url = f"https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={api_key}&client_secret={secret_key}"
    response = requests.post(url)
    result = response.json()
    return result.get('access_token')

def extract_ingredients(text):
    patterns = [
        r'原料组成\s*\n?(.*?)(?=添加剂组成|产品成分|$)',
        r'配料[：:]\s*(.*?)(?=\n\n|$)',
        r'成分[：:]\s*(.*?)(?=\n\n|$)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            raw = match.group(1).replace('\n', '')
            ingredients = re.split(r'[,，、；;]', raw)
            return [i.strip() for i in ingredients if i.strip() and len(i.strip()) > 1]

    return []

def extract_nutrition(text):
    result = {}

    protein_match = re.search(r'粗蛋白质?\s*[≥>]\s*(\d+\.?\d*)\s*%', text)
    if protein_match:
        result['protein'] = float(protein_match.group(1))

    fat_match = re.search(r'粗脂肪?\s*[≥>]\s*(\d+\.?\d*)\s*%', text)
    if fat_match:
        result['fat'] = float(fat_match.group(1))

    fiber_match = re.search(r'粗纤维\s*[≤<]\s*(\d+\.?\d*)\s*%', text)
    if fiber_match:
        result['fiber'] = float(fiber_match.group(1))

    ash_match = re.search(r'粗灰分\s*[≤<]\s*(\d+\.?\d*)\s*%', text)
    if ash_match:
        result['ash'] = float(ash_match.group(1))

    moisture_match = re.search(r'水分\s*[≤<]\s*(\d+\.?\d*)\s*%', text)
    if moisture_match:
        result['moisture'] = float(moisture_match.group(1))

    return result

if __name__ == "__main__":
    import io
    import os
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python ocr_api.py <image_path>"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    result = ocr_recognize(image_path)
    print(json.dumps(result, ensure_ascii=False))
