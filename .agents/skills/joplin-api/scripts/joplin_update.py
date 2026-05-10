#!/usr/bin/env python3
"""
更新 Joplin 笔记
"""
import argparse
import sys
import requests
from joplin_config import get_base_url, get_auth_params, check_config

def update_note(note_id, title=None, body=None):
    """更新笔记"""
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    base_url = get_base_url()
    params = get_auth_params()
    
    data = {}
    if title is not None:
        data['title'] = title
    if body is not None:
        data['body'] = body
    
    if not data:
        print("⚠️ 未提供更新内容")
        return False
    
    try:
        url = f"{base_url}/notes/{note_id}"
        response = requests.put(url, params=params, json=data, timeout=10)
        
        if response.status_code == 200:
            note = response.json()
            print(f"✅ 笔记更新成功!")
            print(f"   标题: {note['title']}")
            print(f"   ID: {note['id']}")
            return True
        elif response.status_code == 404:
            print(f"❌ 笔记不存在: {note_id}")
            return False
        else:
            print(f"❌ 更新失败: HTTP {response.status_code}")
            print(f"   {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ 无法连接到 {base_url}")
        return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='更新 Joplin 笔记')
    parser.add_argument('--id', required=True, help='笔记 ID')
    parser.add_argument('--title', help='新标题')
    parser.add_argument('--body', help='新内容')
    
    args = parser.parse_args()
    success = update_note(args.id, args.title, args.body)
    sys.exit(0 if success else 1)
