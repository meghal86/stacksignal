#!/usr/bin/env python3
"""
PyZotero Python Script - 支持本地和在线 API 的 Zotero 库管理工具

环境变量:
  ZOTERO_LOCAL: "true" 或 "false" (默认："true")
    - true: 使用本地 Zotero API (需要 Zotero 7+ 运行并启用本地访问)
    - false: 使用 Zotero 在线 Web API (需要 API Key)
  
  ZOTERO_USER_ID: (在线 API 必需) 您的 Zotero 用户 ID
  ZOTERO_API_KEY: (在线 API 必需) 您的 Zotero API Key

用法:
  python3 pyzotero.py search -q "关键词"
  python3 pyzotero.py listcollections
  python3 pyzotero.py itemtypes
  python3 pyzotero.py item ITEM_KEY
"""

import os
import sys
import json
import argparse
from datetime import datetime

# 导入 pyzotero
try:
    from pyzotero import zotero
    print("✓ pyzotero 导入成功", file=sys.stderr)
except Exception as e:
    print(f"错误：无法导入 pyzotero 库：{type(e).__name__}: {e}", file=sys.stderr)
    print("请运行：pipx install pyzotero 或 pip install --user --break-system-packages pyzotero", file=sys.stderr)
    sys.exit(1)


def get_zotero_instance():
    """
    根据 ZOTERO_LOCAL 环境变量创建 Zotero 实例
    
    返回:
        zotero.Zotero 或 zotero.Zotero 本地实例
    """
    local_mode = os.environ.get('ZOTERO_LOCAL', 'true').lower() == 'true'
    
    if local_mode:
        # 本地模式：使用本地 Zotero API
        try:
            zot = zotero.Zotero('local', 'user')
            # 测试连接
            zot.num_items()
            print(f"✓ 已连接到本地 Zotero", file=sys.stderr)
            return zot
        except Exception as e:
            print(f"✗ 无法连接到本地 Zotero: {e}", file=sys.stderr)
            print(f"提示：请确保 Zotero 正在运行，并在 设置 > 高级 > 中启用", file=sys.stderr)
            print(f"      '允许此计算机上的其他应用程序与 Zotero 通信'", file=sys.stderr)
            sys.exit(1)
    else:
        # 在线模式：使用 Zotero Web API
        user_id = os.environ.get('ZOTERO_USER_ID')
        api_key = os.environ.get('ZOTERO_API_KEY')
        
        if not user_id or not api_key:
            print("错误：在线模式需要设置 ZOTERO_USER_ID 和 ZOTERO_API_KEY 环境变量", file=sys.stderr)
            print(f"提示：export ZOTERO_USER_ID='your_user_id'", file=sys.stderr)
            print(f"      export ZOTERO_API_KEY='your_api_key'", file=sys.stderr)
            sys.exit(1)
        
        try:
            zot = zotero.Zotero(user_id, 'user', api_key)
            # 测试连接
            zot.num_items()
            print(f"✓ 已连接到 Zotero 在线 API (用户：{user_id})", file=sys.stderr)
            return zot
        except Exception as e:
            print(f"✗ 无法连接到 Zotero 在线 API: {e}", file=sys.stderr)
            sys.exit(1)


def search_items(zot, query, fulltext=False, itemtype=None, collection=None, limit=20, json_output=False):
    """搜索 Zotero 库中的项目"""
    try:
        # 构建搜索参数
        params = {'q': query, 'limit': limit}
        
        if fulltext:
            params['qmode'] = 'everything'
        
        if itemtype:
            params['itemType'] = itemtype
        
        if collection:
            params['collection'] = collection
        
        items = zot.top(**params)
        
        if not items:
            print("未找到匹配的项目。")
            return
        
        if json_output:
            print(json.dumps(items, indent=2, ensure_ascii=False))
        else:
            print(f"找到 {len(items)} 个项目:\n")
            for i, item in enumerate(items, 1):
                data = item.get('data', {})
                title = data.get('title', '无标题')
                item_type = data.get('itemType', 'unknown')
                creators = data.get('creators', [])
                authors = []
                for c in creators[:2]:  # 只显示前两个作者
                    if c.get('firstName') and c.get('lastName'):
                        authors.append(f"{c['firstName']} {c['lastName']}")
                    elif c.get('name'):
                        authors.append(c['name'])
                
                year = data.get('date', '')[:4] if data.get('date') else '无年份'
                
                print(f"{i}. [{item_type}] {title}")
                if authors:
                    print(f"   作者：{', '.join(authors)}")
                print(f"   年份：{year}")
                
                # 显示标签
                tags = data.get('tags', [])
                if tags:
                    tag_list = [t['tag'] for t in tags[:5]]
                    print(f"   标签：{', '.join(tag_list)}")
                
                print(f"   链接：https://www.zotero.org/{zot.library_id}/items/{item['key']}")
                print()
                
    except Exception as e:
        print(f"搜索失败：{e}", file=sys.stderr)
        sys.exit(1)


def list_collections(zot, json_output=False):
    """列出所有集合"""
    try:
        collections = zot.collections()
        
        if not collections:
            print("未找到任何集合。")
            return
        
        if json_output:
            print(json.dumps(collections, indent=2, ensure_ascii=False))
        else:
            print(f"共有 {len(collections)} 个集合:\n")
            for i, coll in enumerate(collections, 1):
                data = coll.get('data', {})
                name = data.get('name', '未命名')
                key = coll.get('key', '')
                parent = data.get('parentCollection', '')
                indent = "  " if parent else ""
                print(f"{i}. {indent}📁 {name}")
                print(f"   密钥：{key}")
                if parent:
                    print(f"   父集合：{parent}")
                print()
                
    except Exception as e:
        print(f"获取集合失败：{e}", file=sys.stderr)
        sys.exit(1)


def list_item_types(zot, json_output=False):
    """列出所有项目类型"""
    try:
        item_types = zot.item_types()
        
        if json_output:
            print(json.dumps(item_types, indent=2, ensure_ascii=False))
        else:
            print(f"共有 {len(item_types)} 种项目类型:\n")
            for i, it in enumerate(item_types, 1):
                print(f"{i}. {it['itemType']}")
                
    except Exception as e:
        print(f"获取项目类型失败：{e}", file=sys.stderr)
        sys.exit(1)


def get_item(zot, item_key, json_output=False):
    """获取单个项目详情"""
    try:
        item = zot.item(item_key)
        
        if not item:
            print("未找到该项目。")
            return
        
        if json_output:
            print(json.dumps(item, indent=2, ensure_ascii=False))
        else:
            data = item.get('data', {})
            print(f"标题：{data.get('title', '无标题')}")
            print(f"类型：{data.get('itemType', 'unknown')}")
            print(f"日期：{data.get('date', '无日期')}")
            
            creators = data.get('creators', [])
            if creators:
                print("\n作者/创作者:")
                for c in creators:
                    if c.get('firstName') and c.get('lastName'):
                        print(f"  - {c['firstName']} {c['lastName']} ({c.get('creatorType', 'Author')})")
                    elif c.get('name'):
                        print(f"  - {c['name']}")
            
            # 显示摘要
            if data.get('abstractNote'):
                print(f"\n摘要：{data['abstractNote'][:500]}")
            
            # 显示标签
            tags = data.get('tags', [])
            if tags:
                print(f"\n标签：{', '.join([t['tag'] for t in tags])}")
            
            # 显示附件
            attachments = zot.children(item_key)
            if attachments:
                print(f"\n附件 ({len(attachments)}):")
                for att in attachments[:5]:
                    att_data = att.get('data', {})
                    print(f"  - {att_data.get('title', '未命名')} ({att_data.get('itemType', 'unknown')})")
            
            print(f"\n链接：https://www.zotero.org/{zot.library_id}/items/{item_key}")
                
    except Exception as e:
        print(f"获取项目失败：{e}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='PyZotero Python 脚本 - Zotero 库管理工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
环境变量:
  ZOTERO_LOCAL     "true" 或 "false" (默认："true")
                   - true: 使用本地 Zotero API
                   - false: 使用 Zotero 在线 Web API
  
  ZOTERO_USER_ID   (在线模式必需) 您的 Zotero 用户 ID
  ZOTERO_API_KEY   (在线模式必需) 您的 Zotero API Key

示例:
  python3 pyzotero.py search -q "machine learning"
  python3 pyzotero.py search -q "neural networks" --fulltext
  python3 pyzotero.py search -q "python" --itemtype journalArticle --json
  python3 pyzotero.py listcollections
  python3 pyzotero.py itemtypes
  python3 pyzotero.py item ABC123
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # search 命令
    search_parser = subparsers.add_parser('search', help='搜索 Zotero 库')
    search_parser.add_argument('-q', '--query', required=True, help='搜索关键词')
    search_parser.add_argument('--fulltext', action='store_true', help='全文搜索 (包括 PDF)')
    search_parser.add_argument('--itemtype', help='按项目类型过滤')
    search_parser.add_argument('--collection', help='在特定集合中搜索')
    search_parser.add_argument('-l', '--limit', type=int, default=20, help='结果数量限制 (默认：20)')
    search_parser.add_argument('--json', action='store_true', dest='json_output', help='输出 JSON 格式')
    
    # listcollections 命令
    lc_parser = subparsers.add_parser('listcollections', help='列出所有集合')
    lc_parser.add_argument('--json', action='store_true', dest='json_output', help='输出 JSON 格式')
    
    # itemtypes 命令
    it_parser = subparsers.add_parser('itemtypes', help='列出所有项目类型')
    it_parser.add_argument('--json', action='store_true', dest='json_output', help='输出 JSON 格式')
    
    # item 命令
    item_parser = subparsers.add_parser('item', help='获取单个项目详情')
    item_parser.add_argument('item_key', help='项目密钥 (key)')
    item_parser.add_argument('--json', action='store_true', dest='json_output', help='输出 JSON 格式')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # 获取 Zotero 实例
    zot = get_zotero_instance()
    
    # 执行命令
    if args.command == 'search':
        search_items(
            zot, 
            args.query, 
            fulltext=args.fulltext,
            itemtype=args.itemtype,
            collection=args.collection,
            limit=args.limit,
            json_output=args.json_output
        )
    elif args.command == 'listcollections':
        list_collections(zot, json_output=args.json_output)
    elif args.command == 'itemtypes':
        list_item_types(zot, json_output=args.json_output)
    elif args.command == 'item':
        get_item(zot, args.item_key, json_output=args.json_output)


if __name__ == '__main__':
    main()
