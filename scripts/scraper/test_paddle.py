from paddleocr import PaddleOCR
import requests
import tempfile

# Initialize with minimal settings
ocr = PaddleOCR(lang='ch')

# Test with a direct image download
url = "https://img.boqiicdn.com/Data/Shop/0/7/742/shopimgFile1697020843.jpg"
resp = requests.get(url, timeout=10)
with open("test_img.jpg", "wb") as f:
    f.write(resp.content)

print("Image saved, running OCR...")
result = ocr.predict("test_img.jpg")
print("Result type:", type(result))
print("Result:", result)
