import requests

api_key = "B9ihGDZLjwn3aKamcvvJrzE9"
secret_key = "bYxlxCw8uZJMb6IYuJmMoQHCG93wBaub"

url = f"https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={api_key}&client_secret={secret_key}"
response = requests.post(url)
result = response.json()

if "access_token" in result:
    print("API 认证成功!")
    print(f"Access Token: {result['access_token'][:30]}...")
else:
    print(f"API 认证失败: {result}")
