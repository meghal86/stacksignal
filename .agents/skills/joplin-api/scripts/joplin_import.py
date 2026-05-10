#!/usr/bin/env python3
"""
导入 Markdown 文件到 Joplin
"""
import argparse
import os
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

def create_folder(name):
    """创建笔记本"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        url = f"{base_url}/folders"
        response = requests.post(url, params=params, json={'title': name}, timeout=10)
        if response.status_code == 200:
            return response.json()['id']
        return None
    except:
        return None

def import_file(file_path, folder_id=None, folder_name=None):
    """导入单个文件"""
    base_url = get_base_url()
    params = get_auth_params()
    
    if folder_name and not folder_id:
        folder_id = find_folder_by_name(folder_name)
        if not folder_id:
            folder_id = create_folder(folder_name)
            print(f"✅ 创建笔记本：{folder_name}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        filename = os.path.basename(file_path)
        title = os.path.splitext(filename)[0]
        
        lines = content.split('\n')
        if lines and lines[0].startswith('# '):
            title = lines[0][2:].strip()
            content = '\n'.join(lines[1:]).strip()
        
        data = {'title': title, 'body': content}
        if folder_id:
            data['parent_id'] = folder_id
        
        url = f"{base_url}/notes"
        response = requests.post(url, params=params, json=data, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ 已导入：{title}")
            return True
        else:
            print(f"❌ 导入失败：{filename}")
            return False
            
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

def import_directory(dir_path, folder_name=None):
    """导入整个目录"""
    imported = 0
    failed = 0
    
    for root, dirs, files in os.walk(dir_path):
        rel_path = os.path.relpath(root, dir_path)
        if rel_path == '.':
            current_folder = folder_name
        else:
            current_folder = folder_name or rel_path.replace(os.sep, '/')
        
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                if import_file(file_path, folder_name=current_folder):
                    imported += 1
                else:
                    failed += 1
    
    print(f"\n📊 导入完成：{imported} 成功，{failed} 失败")
    return failed == 0

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='导入 Markdown 到 Joplin')
    parser.add_argument('path', help='文件或目录路径')
    parser.add_argument('--folder', help='目标笔记本名称')
    parser.add_argument('--folder-id', help='目标笔记本 ID')
    
    args = parser.parse_args()
    
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    if os.path.isfile(args.path):
        success = import_file(args.path, args.folder_id, args.folder)
    elif os.path.isdir(args.path):
        success = import_directory(args.path, args.folder)
    else:
        print(f"❌ 路径不存在：{args.path}")
        sys.exit(1)
    
    sys.exit(0 if success else 1)
