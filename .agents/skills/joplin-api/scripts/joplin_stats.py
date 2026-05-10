#!/usr/bin/env python3
"""
Joplin 统计信息
"""
import sys
import requests
from joplin_config import get_base_url, get_auth_params, check_config

def get_stats():
    """获取统计信息"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        # 获取笔记本数量
        folders_resp = requests.get(f"{base_url}/folders", params=params, timeout=10)
        folders = folders_resp.json().get('items', [])
        
        # 获取笔记总数
        notes_resp = requests.get(f"{base_url}/notes", params={**params, 'fields': 'id'}, timeout=10)
        notes_count = len(notes_resp.json().get('items', []))
        
        # 获取标签数量
        tags_resp = requests.get(f"{base_url}/tags", params=params, timeout=10)
        tags = tags_resp.json().get('items', [])
        
        print("📊 Joplin 统计信息")
        print("=" * 40)
        print(f"📁 笔记本：{len(folders)} 个")
        print(f"📄 笔记：{notes_count} 条")
        print(f"🏷️ 标签：{len(tags)} 个")
        print()
        
        # 每个笔记本的笔记数
        print("📈 笔记本详情:")
        for folder in folders:
            notes_in_folder = requests.get(
                f"{base_url}/folders/{folder['id']}/notes",
                params={**params, 'fields': 'id'},
                timeout=10
            ).json().get('items', [])
            
            print(f"   📘 {folder['title']}: {len(notes_in_folder)} 条")
        
        return True
        
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

if __name__ == '__main__':
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    success = get_stats()
    sys.exit(0 if success else 1)
