#!/usr/bin/env python3
"""
列出 Joplin 内容（笔记、笔记本、标签）
"""
import argparse
import sys
import requests
from joplin_config import get_base_url, get_auth_params, check_config

def list_items(item_type, limit=50):
    """列出指定类型的项目"""
    base_url = get_base_url()
    params = get_auth_params()
    params['limit'] = limit
    
    type_map = {
        'notes': ('📄', 'notes'),
        'folders': ('📘', 'folders'),
        'tags': ('🏷️', 'tags')
    }
    
    if item_type not in type_map:
        print(f"❌ 未知类型：{item_type}")
        return False
    
    emoji, endpoint = type_map[item_type]
    
    try:
        url = f"{base_url}/{endpoint}"
        response = requests.get(url, params=params, timeout=10)
        items = response.json().get('items', [])
        
        type_names = {
            'notes': '笔记',
            'folders': '笔记本',
            'tags': '标签'
        }
        
        print(f"{emoji} 共 {len(items)} 个{type_names[item_type]}:")
        print()
        
        for item in items:
            print(f"{emoji} {item['title']}")
            print(f"   ID: {item['id']}")
            if item_type == 'notes' and item.get('updated_time'):
                from datetime import datetime
                try:
                    dt = datetime.fromtimestamp(item['updated_time'] / 1000)
                    print(f"   更新：{dt.strftime('%Y-%m-%d %H:%M')}")
                except:
                    pass
            print()
        
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"❌ 无法连接到 {base_url}")
        return False
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='列出 Joplin 内容')
    parser.add_argument('--type', choices=['notes', 'folders', 'tags'],
                       required=True, help='项目类型')
    parser.add_argument('--limit', type=int, default=50, help='最大数量')
    
    args = parser.parse_args()
    
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    success = list_items(args.type, args.limit)
    sys.exit(0 if success else 1)
