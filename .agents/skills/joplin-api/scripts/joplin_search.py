#!/usr/bin/env python3
"""
搜索 Joplin 笔记
"""
import argparse
import sys
import requests
from joplin_config import get_base_url, get_auth_params, check_config

def search_notes(query, limit=20):
    """搜索笔记"""
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    base_url = get_base_url()
    params = get_auth_params()
    params['query'] = query
    params['type'] = 'note'
    params['limit'] = limit
    
    try:
        url = f"{base_url}/search"
        response = requests.get(url, params=params, timeout=10)
        items = response.json().get('items', [])
        
        print(f"🔍 搜索 \"{query}\" 找到 {len(items)} 条结果:")
        print()
        
        for item in items:
            print(f"📄 {item['title']}")
            print(f"   ID: {item['id']}")
            if item.get('body'):
                preview = item['body'].replace('\n', ' ')[:150]
                print(f"   预览: {preview}...")
            print()
            
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"❌ 无法连接到 {base_url}")
        return False
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='搜索 Joplin 笔记')
    parser.add_argument('query', help='搜索关键词')
    parser.add_argument('--limit', type=int, default=20, help='最大结果数')
    
    args = parser.parse_args()
    success = search_notes(args.query, args.limit)
    sys.exit(0 if success else 1)
