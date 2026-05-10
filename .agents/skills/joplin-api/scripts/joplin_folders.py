#!/usr/bin/env python3
"""
管理 Joplin 笔记本（文件夹）
"""
import argparse
import sys
import requests
from joplin_config import get_base_url, get_auth_params, check_config

def list_folders():
    """列出所有笔记本"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        url = f"{base_url}/folders"
        response = requests.get(url, params=params, timeout=10)
        items = response.json().get('items', [])
        
        print(f"📁 共 {len(items)} 个笔记本:")
        for item in items:
            print(f"   📘 {item['title']} (ID: {item['id']})")
        return True
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

def create_folder(name, parent_id=None):
    """创建笔记本"""
    base_url = get_base_url()
    params = get_auth_params()
    
    data = {'title': name}
    if parent_id:
        data['parent_id'] = parent_id
    
    try:
        url = f"{base_url}/folders"
        response = requests.post(url, params=params, json=data, timeout=10)
        
        if response.status_code == 200:
            folder = response.json()
            print(f"✅ 已创建笔记本: {folder['title']}")
            print(f"   ID: {folder['id']}")
            return True
        else:
            print(f"❌ 创建失败：{response.text}")
            return False
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

def rename_folder(folder_id, new_name):
    """重命名笔记本"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        url = f"{base_url}/folders/{folder_id}"
        response = requests.put(url, params=params, json={'title': new_name}, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ 已重命名：{new_name}")
            return True
        else:
            print(f"❌ 重命名失败：{response.text}")
            return False
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

def delete_folder(folder_id):
    """删除笔记本"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        url = f"{base_url}/folders/{folder_id}"
        response = requests.delete(url, params=params, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ 已删除笔记本")
            return True
        else:
            print(f"❌ 删除失败：{response.text}")
            return False
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='管理 Joplin 笔记本')
    parser.add_argument('action', choices=['list', 'create', 'rename', 'delete'],
                       help='操作类型')
    parser.add_argument('--name', help='笔记本名称')
    parser.add_argument('--id', help='笔记本 ID')
    parser.add_argument('--parent-id', help='父笔记本 ID（用于创建子笔记本）')
    
    args = parser.parse_args()
    
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    if args.action == 'list':
        success = list_folders()
    elif args.action == 'create':
        if not args.name:
            print("❌ 需要 --name")
            sys.exit(1)
        success = create_folder(args.name, args.parent_id)
    elif args.action == 'rename':
        if not args.id or not args.name:
            print("❌ 需要 --id 和 --name")
            sys.exit(1)
        success = rename_folder(args.id, args.name)
    elif args.action == 'delete':
        if not args.id:
            print("❌ 需要 --id")
            sys.exit(1)
        success = delete_folder(args.id)
    
    sys.exit(0 if success else 1)
