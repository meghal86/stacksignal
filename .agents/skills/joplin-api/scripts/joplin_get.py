#!/usr/bin/env python3
"""
获取 Joplin 笔记详情
"""
import argparse
import sys
import requests
from joplin_config import get_base_url, get_auth_params, check_config

def get_note(note_id):
    """获取笔记详情"""
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        url = f"{base_url}/notes/{note_id}"
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            note = response.json()
            print(f"📄 {note['title']}")
            print(f"   ID: {note['id']}")
            print(f"   创建时间: {note.get('created_time', 'N/A')}")
            print(f"   更新时间: {note.get('updated_time', 'N/A')}")
            print()
            print("📝 内容:")
            print("-" * 50)
            print(note.get('body', '(空)'))
            return True
        elif response.status_code == 404:
            print(f"❌ 笔记不存在: {note_id}")
            return False
        else:
            print(f"❌ 获取失败: HTTP {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ 无法连接到 {base_url}")
        return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='获取 Joplin 笔记')
    parser.add_argument('--id', required=True, help='笔记 ID')
    
    args = parser.parse_args()
    success = get_note(args.id)
    sys.exit(0 if success else 1)
