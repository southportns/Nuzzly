import sys
import json
import tempfile
import requests
import io
from rapidocr_onnxruntime import RapidOCR

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ocr_engine = None

def get_ocr():
    global ocr_engine
    if ocr_engine is None:
        ocr_engine = RapidOCR()
    return ocr_engine

def ocr_from_url(image_url):
    try:
        resp = requests.get(image_url, timeout=10)
        resp.raise_for_status()
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
            f.write(resp.content)
            tmp_path = f.name

        result, _ = get_ocr()(tmp_path)
        texts = []
        if result:
            for item in result:
                texts.append({"text": item[1], "confidence": float(item[2])})
        return {"texts": texts, "full_text": "\n".join(t["text"] for t in texts)}
    except Exception as e:
        return {"texts": [], "full_text": "", "error": str(e)}

if __name__ == "__main__":
    url = sys.argv[1]
    result = ocr_from_url(url)
    print(json.dumps(result, ensure_ascii=False))
