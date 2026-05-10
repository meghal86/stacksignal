#!/usr/bin/env python3
"""
Joplin API 配置模块
"""
import os
from dotenv import load_dotenv

# 加载 .env 文件（如果存在）
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# 配置项（优先级：环境变量 > .env 文件 > 默认值）
JOPLIN_HOST = os.getenv('JOPLIN_HOST', 'localhost')
JOPLIN_PORT = os.getenv('JOPLIN_PORT', '41184')
JOPLIN_TOKEN = os.getenv('JOPLIN_TOKEN', '')

def get_base_url():
    """获取 Joplin API 基础 URL"""
    return f"http://{JOPLIN_HOST}:{JOPLIN_PORT}"

def get_auth_params():
    """获取认证参数"""
    return {'token': JOPLIN_TOKEN} if JOPLIN_TOKEN else {}

def check_config():
    """检查配置是否完整"""
    if not JOPLIN_TOKEN:
        return False, "未设置 JOPLIN_TOKEN，请在 .env 文件或环境变量中配置"
    return True, None
