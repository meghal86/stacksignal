#!/usr/bin/env python3
"""
Joplin CLI - 统一管理入口
"""
import argparse
import subprocess
import sys
import os

SCRIPT_DIR = os.path.dirname(__file__)

def run_script(script_name, args):
    """运行脚本"""
    script_path = os.path.join(SCRIPT_DIR, f"{script_name}.py")
    cmd = [sys.executable, script_path] + args
    subprocess.run(cmd)

def main():
    parser = argparse.ArgumentParser(description='Joplin 管理工具', prog='joplin')
    parser.add_argument('command', choices=[
        'ping', 'stats', 'recent',
        'list', 'get', 'create', 'update', 'delete',
        'search', 'move', 'export', 'import',
        'folders', 'tags', 'folder-notes'
    ], help='命令')
    parser.add_argument('args', nargs='*', help='命令参数')
    
    args = parser.parse_args()
    
    command_map = {
        'ping': 'joplin_ping',
        'stats': 'joplin_stats',
        'recent': 'joplin_recent',
        'list': 'joplin_list',
        'get': 'joplin_get',
        'create': 'joplin_create',
        'update': 'joplin_update',
        'delete': 'joplin_delete',
        'search': 'joplin_search',
        'move': 'joplin_move',
        'export': 'joplin_export',
        'import': 'joplin_import',
        'folders': 'joplin_folders',
        'tags': 'joplin_tags',
        'folder-notes': 'joplin_folder_notes',
    }
    
    script = command_map.get(args.command)
    if script:
        run_script(script, args.args)
    else:
        print(f"未知命令：{args.command}")
        sys.exit(1)

if __name__ == '__main__':
    main()
