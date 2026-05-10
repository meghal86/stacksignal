#!/usr/bin/env python3
"""
删除 Joplin 笔记、笔记本或标签
"""
import argparse
import sys
import requests
from joplin_config import get_base_url, get_auth_params, check_config

def delete_item(item_id, item_type):
    """删除项目"""
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    base_url = get_base_url()
    params = get_auth_params()
    
    type_map = {
        'notes': 'notes',
        'folders': 'folders',
        'tags': 'tags'
    }
    
    endpoint = type_map.get(item_type, item_type)
    
    try:
        url = f"{base_url}/{endpoint}/{item_id}"
        response = requests.delete(url, params=params, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ 删除成功!")
            print(f"   类型: {item_type}")
            print(f"   ID: {item_id}")
            return True
        elif response.status_code == 404:
            print(f"❌ 项目不存在: {item_id}")
            return False
        else:
            print(f"❌ 删除失败: HTTP {response.status_code}")
            print(f"   {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ 无法连接到 {base_url}")
        return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='删除 Joplin 项目')
    parser.add_argument('--id', required=True, help='项目 ID')
    parser.add_argument('--type', choices=['notes', 'folders', 'tags'], 
                       default='notes', help='项目类型')
    
    args = parser.parse_args()
    success = delete_item(args.id, args.type)
    sys.exit(0 if success else 1)
