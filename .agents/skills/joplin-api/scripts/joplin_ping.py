#!/usr/bin/env python3
"""
测试 Joplin Data API 连接
"""
import sys
import requests
from joplin_config import get_base_url, get_auth_params, check_config

def ping():
    """测试 API 连接"""
    ok, msg = check_config()
    if not ok:
        print(f"❌ 配置错误: {msg}")
        print(f"\n当前配置:")
        print(f"  主机: {get_base_url()}")
        sys.exit(1)
    
    try:
        url = f"{get_base_url()}/ping"
        response = requests.get(url, params=get_auth_params(), timeout=10)
        
        if response.status_code == 200:
            print(f"✅ 连接成功!")
            print(f"   服务器: {get_base_url()}")
            print(f"   响应: {response.text}")
            return True
        else:
            print(f"❌ 连接失败: HTTP {response.status_code}")
            print(f"   响应: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ 无法连接到 {get_base_url()}")
        print("   请检查：")
        print("   1. Joplin Web Clipper 是否已启用")
        print("   2. 主机地址和端口是否正确")
        print("   3. 防火墙是否允许连接")
        return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

if __name__ == '__main__':
    success = ping()
    sys.exit(0 if success else 1)
