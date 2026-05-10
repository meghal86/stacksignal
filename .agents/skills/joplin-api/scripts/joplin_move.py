#!/usr/bin/env python3
"""
移动 Joplin 笔记到指定笔记本
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

def move_note(note_id, folder_id):
    """移动笔记到指定笔记本"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        url = f"{base_url}/notes/{note_id}"
        data = {'parent_id': folder_id}
        response = requests.put(url, params=params, json=data, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ 笔记已移动")
            return True
        else:
            print(f"❌ 移动失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

def move_notes_by_folder(source_folder_name, target_folder_name):
    """批量移动一个笔记本的所有笔记到另一个笔记本"""
    base_url = get_base_url()
    params = get_auth_params()
    
    source_id = find_folder_by_name(source_folder_name)
    target_id = find_folder_by_name(target_folder_name)
    
    if not source_id:
        print(f"❌ 未找到源笔记本: {source_folder_name}")
        return False
    if not target_id:
        print(f"❌ 未找到目标笔记本: {target_folder_name}")
        return False
    
    # 获取源笔记本的所有笔记
    url = f"{base_url}/folders/{source_id}/notes"
    response = requests.get(url, params=params, timeout=10)
    notes = response.json().get('items', [])
    
    print(f"📦 将移动 {len(notes)} 条笔记...")
    
    success_count = 0
    for note in notes:
        if move_note(note['id'], target_id):
            success_count += 1
            print(f"   ✓ {note['title']}")
    
    print(f"\n✅ 成功移动 {success_count}/{len(notes)} 条笔记")
    return success_count == len(notes)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='移动 Joplin 笔记')
    parser.add_argument('--note-id', help='要移动的笔记 ID')
    parser.add_argument('--to-folder-id', help='目标笔记本 ID')
    parser.add_argument('--to-folder', help='目标笔记本名称')
    parser.add_argument('--batch-from', help='批量移动: 源笔记本名称')
    parser.add_argument('--batch-to', help='批量移动: 目标笔记本名称')
    
    args = parser.parse_args()
    
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    if args.batch_from and args.batch_to:
        success = move_notes_by_folder(args.batch_from, args.batch_to)
    elif args.note_id:
        folder_id = args.to_folder_id
        if args.to_folder and not folder_id:
            folder_id = find_folder_by_name(args.to_folder)
            if not folder_id:
                print(f"❌ 未找到笔记本: {args.to_folder}")
                sys.exit(1)
        
        if not folder_id:
            print("❌ 需要指定 --to-folder-id 或 --to-folder")
            sys.exit(1)
        
        success = move_note(args.note_id, folder_id)
    else:
        print("❌ 需要 --note-id 或 --batch-from/--batch-to")
        sys.exit(1)
    
    sys.exit(0 if success else 1)
