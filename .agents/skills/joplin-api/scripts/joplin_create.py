#!/usr/bin/env python3
"""
创建 Joplin 笔记
"""
import argparse
import sys
import requests
from joplin_config import get_base_url, get_auth_params, check_config

def find_folder_by_name(name):
    """通过名称查找笔记本"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        url = f"{base_url}/folders"
        response = requests.get(url, params=params, timeout=10)
        folders = response.json()
        
        for folder in folders.get('items', []):
            if folder['title'] == name:
                return folder['id']
        return None
    except:
        return None

def create_note(title, body='', folder_id=None, folder_name=None):
    """创建笔记"""
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    base_url = get_base_url()
    params = get_auth_params()
    
    # 如果提供了文件夹名称，查找对应 ID
    if folder_name and not folder_id:
        folder_id = find_folder_by_name(folder_name)
        if not folder_id:
            print(f"⚠️ 未找到笔记本 \"{folder_name}\"，将创建在默认位置")
    
    data = {
        'title': title,
        'body': body
    }
    
    if folder_id:
        data['parent_id'] = folder_id
    
    try:
        url = f"{base_url}/notes"
        response = requests.post(url, params=params, json=data, timeout=10)
        
        if response.status_code == 200:
            note = response.json()
            print(f"✅ 笔记创建成功!")
            print(f"   标题: {note['title']}")
            print(f"   ID: {note['id']}")
            return True
        else:
            print(f"❌ 创建失败: HTTP {response.status_code}")
            print(f"   {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ 无法连接到 {base_url}")
        return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='创建 Joplin 笔记')
    parser.add_argument('--title', required=True, help='笔记标题')
    parser.add_argument('--body', default='', help='笔记内容')
    parser.add_argument('--folder', help='目标笔记本名称')
    parser.add_argument('--folder-id', help='目标笔记本 ID')
    
    args = parser.parse_args()
    success = create_note(args.title, args.body, args.folder_id, args.folder)
    sys.exit(0 if success else 1)
