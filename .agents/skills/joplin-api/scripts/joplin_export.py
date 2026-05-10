#!/usr/bin/env python3
"""
导出 Joplin 笔记
"""
import argparse
import json
import os
import sys
import requests
from joplin_config import get_base_url, get_auth_params, check_config

def export_note(note_id, output_path, format='md'):
    """导出单条笔记"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        url = f"{base_url}/notes/{note_id}"
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ 获取笔记失败")
            return False
        
        note = response.json()
        
        if format == 'json':
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(note, f, ensure_ascii=False, indent=2)
        else:
            content = f"# {note['title']}\n\n{note.get('body', '')}"
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        print(f"✅ 已导出：{output_path}")
        return True
        
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

def export_all(output_dir, format='md'):
    """导出所有笔记"""
    base_url = get_base_url()
    params = get_auth_params()
    
    try:
        folders_resp = requests.get(f"{base_url}/folders", params=params, timeout=10)
        folders = folders_resp.json().get('items', [])
        
        os.makedirs(output_dir, exist_ok=True)
        total = 0
        
        for folder in folders:
            safe_name = "".join(c for c in folder['title'] if c.isalnum() or c in (' ', '-', '_')).strip()
            folder_dir = os.path.join(output_dir, safe_name)
            os.makedirs(folder_dir, exist_ok=True)
            
            notes_resp = requests.get(f"{base_url}/folders/{folder['id']}/notes", params=params, timeout=10)
            notes = notes_resp.json().get('items', [])
            
            for note in notes:
                safe_title = "".join(c for c in note['title'] if c.isalnum() or c in (' ', '-', '_')).strip()[:50]
                if format == 'json':
                    filename = f"{safe_title}.json"
                else:
                    filename = f"{safe_title}.md"
                
                filepath = os.path.join(folder_dir, filename)
                
                if format == 'json':
                    content = json.dumps(note, ensure_ascii=False, indent=2)
                else:
                    content = f"# {note['title']}\n\n{note.get('body', '')}"
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                total += 1
        
        print(f"✅ 已导出 {total} 条笔记到：{output_dir}")
        return True
        
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='导出 Joplin 笔记')
    parser.add_argument('--note-id', help='导出单条笔记的 ID')
    parser.add_argument('--output', '-o', required=True, help='输出路径')
    parser.add_argument('--format', choices=['md', 'json'], default='md', help='导出格式')
    parser.add_argument('--all', action='store_true', help='导出所有笔记')
    
    args = parser.parse_args()
    
    ok, msg = check_config()
    if not ok:
        print(f"❌ {msg}")
        sys.exit(1)
    
    if args.all:
        success = export_all(args.output, args.format)
    elif args.note_id:
        success = export_note(args.note_id, args.output, args.format)
    else:
        print("❌ 需要 --note-id 或 --all")
        sys.exit(1)
    
    sys.exit(0 if success else 1)
