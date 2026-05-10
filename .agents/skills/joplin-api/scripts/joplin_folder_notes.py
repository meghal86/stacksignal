#!/usr/bin/env python3
"""
列出 Joplin 笔记本中的笔记
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

def list_folder_notes(folder_id=None, folder_name=None):
    """列出一个笔记本中的所有笔记"""
    base_url = get_base_url()
    params = get_auth_params()
    
    if folder_name and not folder_id:
        folder_id = find_folder_by_name(folder_name)
        if not folder_id:
            print(f"❌ 未找到笔记本: {folder_name}")
            return False
    
    if not folder_id:
        print("❌ 需要指定 --folder-id 或 --folder")
        return False
    
    try:
        # 获取笔记本信息
        folder_resp = requests.get(f"{base_url}/folders/{folder_id}", params=params, timeout=10)
        if folder_resp.status_code == 200:
            folder_title = folder_resp.json().get('title', 'Unknown')
        else:
            folder_title = 'Unknown'
        
        # 获取笔记列表
        url = f"{base_url}/folders/{folder_id}/notes"
        response = requests.get(url, params=params, timeout=10)
        items = response.json().get('items', [])
        
        print(f"📁 {folder_title} ({len(items)} 条笔记):")
        print()
        
        for item in items:
            print(f"   📄 {item['title']}")
            print(f"      ID: {item['id']}")
            print(f"      更新: {item.get('updated_time', 'N/A')}")
            print()
        
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"❌ 无法连接到 {base_url}")
        return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='列出笔记本中的笔记')
    parser.add_argument('--folder-id', help='笔记本 ID')
    parser.add_argument('--folder', help='笔记本名称')
    
    args = parser.parse_args()
    
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    success = list_folder_notes(args.folder_id, args.folder)
    sys.exit(0 if success else 1)
