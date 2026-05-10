#!/usr/bin/env python3
"""
管理 Joplin 标签
"""
import argparse
import sys
import requests
from joplin_config import get_base_url, get_auth_params, check_config

def list_tags():
    """列出所有标签"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        url = f"{base_url}/tags"
        response = requests.get(url, params=params, timeout=10)
        items = response.json().get('items', [])
        
        print(f"🏷️ 共 {len(items)} 个标签:")
        for item in items:
            print(f"   • {item['title']} (ID: {item['id']})")
        return True
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

def list_note_tags(note_id):
    """列出笔记的标签"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        url = f"{base_url}/notes/{note_id}/tags"
        response = requests.get(url, params=params, timeout=10)
        items = response.json().get('items', [])
        
        if items:
            print(f"🏷️ 该笔记的标签:")
            for item in items:
                print(f"   • {item['title']}")
        else:
            print("📄 该笔记暂无标签")
        return True
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

def add_tag(note_id, tag_title):
    """为笔记添加标签"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        url = f"{base_url}/tags"
        response = requests.get(url, params=params, timeout=10)
        tags = response.json().get('items', [])
        
        tag_id = None
        for tag in tags:
            if tag['title'] == tag_title:
                tag_id = tag['id']
                break
        
        if not tag_id:
            response = requests.post(url, params=params, json={'title': tag_title}, timeout=10)
            if response.status_code == 200:
                tag_id = response.json()['id']
                print(f"✅ 创建新标签：{tag_title}")
            else:
                print(f"❌ 创建标签失败")
                return False
        
        url = f"{base_url}/tags/{tag_id}/notes"
        response = requests.post(url, params=params, json={'id': note_id}, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ 已为笔记添加标签：{tag_title}")
            return True
        else:
            print(f"❌ 添加标签失败：{response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

def remove_tag(note_id, tag_id):
    """从笔记移除标签"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        url = f"{base_url}/tags/{tag_id}/notes/{note_id}"
        response = requests.delete(url, params=params, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ 已移除标签")
            return True
        else:
            print(f"❌ 移除失败")
            return False
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='管理 Joplin 标签')
    parser.add_argument('action', choices=['list', 'add', 'remove', 'note-tags'],
                       help='操作类型')
    parser.add_argument('--note-id', help='笔记 ID')
    parser.add_argument('--tag', help='标签名称（用于 add）')
    parser.add_argument('--tag-id', help='标签 ID（用于 remove）')
    
    args = parser.parse_args()
    
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    if args.action == 'list':
        success = list_tags()
    elif args.action == 'note-tags':
        if not args.note_id:
            print("❌ 需要 --note-id")
            sys.exit(1)
        success = list_note_tags(args.note_id)
    elif args.action == 'add':
        if not args.note_id or not args.tag:
            print("❌ 需要 --note-id 和 --tag")
            sys.exit(1)
        success = add_tag(args.note_id, args.tag)
    elif args.action == 'remove':
        if not args.note_id or not args.tag_id:
            print("❌ 需要 --note-id 和 --tag-id")
            sys.exit(1)
        success = remove_tag(args.note_id, args.tag_id)
    
    sys.exit(0 if success else 1)
