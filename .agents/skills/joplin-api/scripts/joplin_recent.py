#!/usr/bin/env python3
"""
列出最近的 Joplin 笔记
"""
import argparse
import sys
from datetime import datetime
import requests
from joplin_config import get_base_url, get_auth_params, check_config

def list_recent(limit=10):
    """列出最近更新的笔记"""
    base_url = get_base_url()
    params = get_auth_params()
    params['order_by'] = 'updated_time'
    params['order_dir'] = 'DESC'
    params['limit'] = limit
    
    try:
        url = f"{base_url}/notes"
        response = requests.get(url, params=params, timeout=10)
        items = response.json().get('items', [])
        
        print(f"🕐 最近更新的 {len(items)} 条笔记:")
        print()
        
        for item in items:
            updated = item.get('updated_time', '')
            if updated:
                # 转换时间格式
                try:
                    dt = datetime.fromtimestamp(updated / 1000)
                    time_str = dt.strftime('%Y-%m-%d %H:%M')
                except:
                    time_str = updated
            else:
                time_str = 'N/A'
            
            print(f"📄 {item['title']}")
            print(f"   更新：{time_str}")
            print()
        
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"❌ 无法连接到 {base_url}")
        return False
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='列出最近的 Joplin 笔记')
    parser.add_argument('--limit', type=int, default=10, help='显示数量')
    
    args = parser.parse_args()
    
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    success = list_recent(args.limit)
    sys.exit(0 if success else 1)
