#!/usr/bin/env python3
"""
LangExtract Search - Zhipu + DuckDuckGo + langextract Workflow
集成智谱 MCP 搜索、DuckDuckGo 搜索和 langextract 结构化提取
"""

import json
import os
import sys
import argparse
import subprocess
import requests
from datetime import datetime
from pathlib import Path


def get_project_root():
    """Get project root directory - relative to this script."""
    return Path(__file__).parent.parent


def get_scripts_dir():
    """Get scripts directory - where this script and langextract are located."""
    return Path(__file__).parent


def add_project_path():
    """Add scripts directory to Python path so we can import bundled langextract."""
    scripts_dir = get_scripts_dir()
    if str(scripts_dir) not in sys.path:
        sys.path.append(str(scripts_dir))


def load_openclaw_config():
    """Load OpenClaw configuration."""
    config_path = Path.home() / ".openclaw" / "openclaw.json"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def parse_mcp_output(output: str):
    """Parse MCP output - handle double-quoted JSON."""
    try:
        # First parse: get the string
        first_parse = json.loads(output.strip())
        if isinstance(first_parse, str):
            # Second parse: parse the string to get the array
            return json.loads(first_parse)
        elif isinstance(first_parse, list):
            # Already an array
            return first_parse
        else:
            raise ValueError(f"Unexpected type: {type(first_parse)}")
    except Exception as e:
        print(f"   解析调试: {e}")
        print(f"   原始输出: {repr(output[:200])}")
        raise


def search_with_zhipu_mcp(query: str, verbose: bool = False):
    """
    Step 1a: Search using Zhipu AI's official zai-sdk (web_search API).
    """
    if verbose:
        print("\n" + "=" * 60)
        print("🔍 步骤 1a: 智谱 AI 网络搜索")
        print("=" * 60)
        print(f"\n📥 输入:")
        print(f"   搜索查询: {query}")
    
    try:
        # Try to use zai-sdk first (official SDK from Zhipu)
        try:
            from zai import ZhipuAiClient
            has_zai = True
        except ImportError:
            has_zai = False
        
        # Get API key from config or environment - priority: zhipu_search_api_key > zhipu_api_key
        api_key = os.getenv('ZHIPU_SEARCH_API_KEY') 
        
        if not api_key:
            raise ValueError("Zhipu API Key not found in OpenClaw config or environment variables")
        
        if verbose:
            print(f"\n🤖 正在调用智谱搜索 API...")
            print(f"   API Key: {api_key[:10]}...{api_key[:3]}")
            print(f"   使用 zai-sdk: {has_zai}")
        
        search_results = []
        
        if has_zai:
            # Use official zai-sdk
            client = ZhipuAiClient(api_key=api_key)
            
            response = client.web_search.web_search(
                search_engine="search_pro",
                search_query=query,
                count=15,
                search_recency_filter="noLimit",
                content_size="high"
            )
            
            # Parse search results from the response
            if hasattr(response, 'search_result') and response.search_result:
                for item in response.search_result:
                    search_results.append({
                        "title": getattr(item, "title", ""),
                        "link": getattr(item, "link", ""),
                        "content": getattr(item, "content", ""),
                        "publish_date": getattr(item, "publish_date", ""),
                        "site_name": getattr(item, "media", "")
                    })
            # Also check if response is a dict-like object
            elif isinstance(response, dict) and 'search_result' in response:
                for item in response['search_result']:
                    search_results.append({
                        "title": item.get("title", ""),
                        "link": item.get("link", ""),
                        "content": item.get("content", ""),
                        "publish_date": item.get("publish_date", ""),
                        "site_name": item.get("media", "")
                    })
        
        # If no results from SDK, fall back to DuckDuckGo
        if not search_results:
            if verbose:
                print(f"   智谱搜索未获取到结果，将使用 DuckDuckGo...")
            
            # Return empty result so the workflow can use DuckDuckGo instead
            return {
                "success": False,
                "error": "Zhipu search did not return results, will use DuckDuckGo",
                "query": query,
                "source": "zhipu"
            }
        
        if verbose:
            print(f"\n📤 输出:")
            print(f"   智谱搜索成功: ✅")
            print(f"   找到结果: {len(search_results)} 条")
            
            for i, item in enumerate(search_results[:3], 1):
                print(f"\n   {i}. {item.get('title', 'No title')}")
                print(f"      URL: {item.get('link', 'No link')}")
                print(f"      日期: {item.get('publish_date', 'No date')}")
                content = item.get('content', '')
                print(f"      摘要: {content[:100]}...")
        
        # Combine search results into a single text
        combined_content = ""
        for item in search_results:
            title = item.get('title', '')
            link = item.get('link', '')
            content = item.get('content', '')
            date = item.get('publish_date', '')
            
            combined_content += f"# [智谱] {title}\n"
            if date:
                combined_content += f"日期: {date}\n"
            if link:
                combined_content += f"链接: {link}\n"
            combined_content += f"\n{content}\n\n"
        
        return {
            "success": True,
            "query": query,
            "search_results": search_results,
            "combined_content": combined_content,
            "source": "zhipu"
        }
        
    except Exception as e:
        if verbose:
            print(f"\n❌ 智谱搜索失败: {e}")
            print(f"   将使用 DuckDuckGo 作为替代...")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "query": query,
            "source": "zhipu"
        }


def search_with_duckduckgo(query: str, verbose: bool = False, max_results: int = 20):
    """
    Step 1b: Search using DuckDuckGo (ddgs).
    """
    if verbose:
        print("\n" + "=" * 60)
        print("🔍 步骤 1b: DuckDuckGo 搜索")
        print("=" * 60)
        print(f"\n📥 输入:")
        print(f"   搜索查询: {query}")
    
    try:
        from ddgs import DDGS
        
        if verbose:
            print(f"\n🤖 正在调用 DuckDuckGo...")
        
        with DDGS() as ddgs:
            search_results = list(ddgs.text(query, max_results=max_results))
        
        if verbose:
            print(f"\n📤 输出:")
            print(f"   DuckDuckGo 搜索成功: ✅")
            print(f"   找到结果: {len(search_results)} 条")
            
            for i, item in enumerate(search_results[:3], 1):
                print(f"\n   {i}. {item.get('title', 'No title')}")
                print(f"      URL: {item.get('href', 'No link')}")
                content = item.get('body', '')
                print(f"      摘要: {content[:100]}...")
        
        # Combine search results into a single text
        combined_content = ""
        for item in search_results:
            title = item.get('title', '')
            link = item.get('href', '')
            content = item.get('body', '')
            
            combined_content += f"# [DuckDuckGo] {title}\n"
            if link:
                combined_content += f"链接: {link}\n"
            combined_content += f"\n{content}\n\n"
        
        return {
            "success": True,
            "query": query,
            "search_results": search_results,
            "combined_content": combined_content,
            "source": "duckduckgo"
        }
        
    except Exception as e:
        if verbose:
            print(f"\n❌ DuckDuckGo 搜索失败: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "query": query,
            "source": "duckduckgo"
        }


def extract_with_langextract(zhipu_data, ddg_data, verbose: bool = False):
    """
    Step 2: Extract structured information using configured model (doubao/glm/zhipu).
    """
    if verbose:
        print("\n" + "=" * 60)
        print("📝 步骤 2: 结构化提取")
        print("=" * 60)
    
    # Combine both search results
    combined_content = ""
    if zhipu_data.get("success"):
        combined_content += zhipu_data["combined_content"]
    if ddg_data.get("success"):
        combined_content += ddg_data["combined_content"]
    
    if not combined_content:
        if verbose:
            print("❌ 两个搜索都失败，无法提取信息")
        return {
            "success": False,
            "error": "Both searches failed",
            "zhipu_data": zhipu_data,
            "ddg_data": ddg_data
        }
    
    try:
        config = load_openclaw_config()
        
        # Determine which model provider to use (priority: default model in config)
        model_provider = None
        model_name = None
        api_key = None
        base_url = None
        
        # First, check if there's a default model configured
        if config and 'models' in config:
            default_model = config['models'].get('defaultModel')
            if default_model:
                # Parse model name like "ark/doubao-seed-2-0-code" or "glm/glm-4-flash"
                if '/' in default_model:
                    provider_part, model_part = default_model.split('/', 1)
                    model_provider = provider_part
                    model_name = model_part
        
        # If no default model or couldn't parse, try to find available providers
        if not model_provider or not model_name:
            # Check providers in order: ark (doubao) first, then glm (zhipu)
            providers_config = config.get('models', {}).get('providers', {}) if config else {}
            
            if 'ark' in providers_config:
                model_provider = 'ark'
                model_name = 'doubao-seed-2-0-code'
            elif 'glm' in providers_config:
                model_provider = 'glm'
                model_name = 'glm-4-flash'
        
        # Get provider config
        provider_config = {}
        if config and 'models' in config and 'providers' in config['models']:
            provider_config = config['models']['providers'].get(model_provider, {})
        
        # Get API key and base URL
        if model_provider == 'ark':
            # Doubao/Ark configuration
            api_key = provider_config.get('apiKey')
            base_url = provider_config.get('baseUrl', 'https://ark.cn-beijing.volces.com/api/coding/v3')
            if not model_name:
                model_name = 'doubao-seed-2-0-code'
        elif model_provider == 'glm':
            # Zhipu/GLM configuration
            api_key = (
                provider_config.get('zhipu_search_api_key') or 
                provider_config.get('zhipu_api_key') or 
                provider_config.get('apiKey')
            )
            base_url = provider_config.get('baseUrl', 'https://open.bigmodel.cn/api/paas/v4')
            if not model_name:
                model_name = 'glm-4-flash'
        else:
            raise ValueError(f"Unsupported model provider: {model_provider}")
        
        if not api_key:
            raise ValueError(f"API Key not found for provider: {model_provider}")
        
        if verbose:
            print(f"\n📥 输入:")
            print(f"   总搜索内容长度: {len(combined_content)} 字符")
            print(f"   模型提供商: {model_provider}")
            print(f"   模型名称: {model_name}")
            print(f"   API Key: {api_key[:10]}...")
            print(f"   Base URL: {base_url}")
        
        extraction_prompt = f"""基于以下网络搜索结果（包含智谱和 DuckDuckGo 的结果），请提取结构化信息：

搜索结果：
{combined_content}

请提取以下信息：
1. 主要内容摘要
2. 关键点列表（3-5个）
3. 相关事实或数据
4. 来源或参考信息（如果有）

请用清晰的格式输出。"""
        
        if verbose:
            print(f"\n🤖 正在调用 {model_provider} API...")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "user",
                    "content": extraction_prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 2000,
            "top_p": 0.9
        }
        
        response = requests.post(
            f"{base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=120
        )
        response.raise_for_status()
        
        result = response.json()
        extracted_info = result["choices"][0]["message"]["content"]
        
        if verbose:
            print(f"\n📤 输出:")
            print(f"   提取成功: ✅")
            print(f"   提取内容长度: {len(extracted_info)} 字符")
            print(f"\n   提取内容（前500字符）:")
            print(f"   {extracted_info[:500]}...")
        
        return {
            "success": True,
            "zhipu_data": zhipu_data,
            "ddg_data": ddg_data,
            "combined_content": combined_content,
            "extracted_info": extracted_info,
            "model_provider": model_provider,
            "model_name": model_name,
            "input": {
                "total_content_length": len(combined_content),
                "extraction_prompt": extraction_prompt[:200] + "..."
            }
        }
        
    except Exception as e:
        if verbose:
            print(f"\n❌ 提取失败: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "zhipu_data": zhipu_data,
            "ddg_data": ddg_data
        }


def save_results(final_result, output_dir: str, save_json: bool = False, verbose: bool = False):
    """Save results to files."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if verbose:
        print("\n" + "=" * 60)
        print("💾 保存结果")
        print("=" * 60)
        print(f"\n输出目录: {output_dir}")
    
    saved_files = []
    
    # Save Zhipu search result
    if final_result.get("zhipu_data", {}).get("success"):
        zhipu_file = output_path / f"zhipu_search_result_{timestamp}.md"
        with open(zhipu_file, "w", encoding="utf-8") as f:
            f.write(f"# 智谱 MCP 搜索结果\n\n")
            f.write(f"**查询**: {final_result['zhipu_data']['query']}\n\n")
            f.write(f"**时间**: {datetime.now().isoformat()}\n\n")
            f.write("---\n\n")
            f.write(final_result['zhipu_data']['combined_content'])
        saved_files.append(str(zhipu_file))
        if verbose:
            print(f"✅ 已保存: {zhipu_file.name}")
    
    # Save DuckDuckGo search result
    if final_result.get("ddg_data", {}).get("success"):
        ddg_file = output_path / f"duckduckgo_search_result_{timestamp}.md"
        with open(ddg_file, "w", encoding="utf-8") as f:
            f.write(f"# DuckDuckGo 搜索结果\n\n")
            f.write(f"**查询**: {final_result['ddg_data']['query']}\n\n")
            f.write(f"**时间**: {datetime.now().isoformat()}\n\n")
            f.write("---\n\n")
            f.write(final_result['ddg_data']['combined_content'])
        saved_files.append(str(ddg_file))
        if verbose:
            print(f"✅ 已保存: {ddg_file.name}")
    
    # Save extracted info
    if final_result.get("success") and final_result.get("extracted_info"):
        extract_file = output_path / f"extracted_info_{timestamp}.md"
        with open(extract_file, "w", encoding="utf-8") as f:
            f.write(f"# 提取的结构化信息\n\n")
            f.write(f"**源查询**: {final_result['zhipu_data']['query'] if final_result.get('zhipu_data') else final_result['ddg_data']['query']}\n\n")
            f.write(f"**时间**: {datetime.now().isoformat()}\n\n")
            f.write("---\n\n")
            f.write(final_result['extracted_info'])
        saved_files.append(str(extract_file))
        if verbose:
            print(f"✅ 已保存: {extract_file.name}")
    
    # Save workflow summary
    summary_file = output_path / f"workflow_summary_{timestamp}.md"
    with open(summary_file, "w", encoding="utf-8") as f:
        f.write(f"# 工作流摘要\n\n")
        f.write(f"**时间**: {datetime.now().isoformat()}\n\n")
        f.write(f"**状态**: {'✅ 成功' if final_result.get('success') else '❌ 失败'}\n\n")
        
        if final_result.get("success"):
            query = final_result['zhipu_data']['query'] if final_result.get('zhipu_data') else final_result['ddg_data']['query']
            f.write(f"**查询**: {query}\n\n")
            if final_result.get("zhipu_data", {}).get("success"):
                f.write(f"**智谱搜索结果数**: {len(final_result['zhipu_data'].get('search_results', []))} 条\n\n")
            if final_result.get("ddg_data", {}).get("success"):
                f.write(f"**DuckDuckGo 搜索结果数**: {len(final_result['ddg_data'].get('search_results', []))} 条\n\n")
            f.write(f"**总搜索内容长度**: {len(final_result['combined_content'])} 字符\n\n")
            if final_result.get("extracted_info"):
                f.write(f"**提取内容长度**: {len(final_result['extracted_info'])} 字符\n\n")
        
        if final_result.get("error"):
            f.write(f"**错误**: {final_result['error']}\n\n")
        
        if final_result.get("warning"):
            f.write(f"**警告**: {final_result['warning']}\n\n")
    
    saved_files.append(str(summary_file))
    if verbose:
        print(f"✅ 已保存: {summary_file.name}")
    
    # Save full JSON
    if save_json:
        json_file = output_path / f"full_results_{timestamp}.json"
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(final_result, f, ensure_ascii=False, indent=2)
        saved_files.append(str(json_file))
        if verbose:
            print(f"✅ 已保存: {json_file.name}")
    
    return saved_files


def main():
    # Add scripts path first so we can import bundled langextract
    add_project_path()
    
    parser = argparse.ArgumentParser(
        description="智谱 MCP + DuckDuckGo + 豆包 搜索提取工作流"
    )
    parser.add_argument(
        "query",
        nargs="?",
        help="搜索关键词（也可以用 --query 指定）"
    )
    parser.add_argument(
        "--query",
        help="搜索关键词"
    )
    parser.add_argument(
        "--save-json",
        action="store_true",
        help="保存完整的 JSON 结果"
    )
    parser.add_argument(
        "--output-dir",
        default=str(get_project_root() / "output"),
        help="输出目录"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="显示详细的输入和输出信息（验证用）"
    )
    parser.add_argument(
        "--ddg-max-results",
        type=int,
        default=20,
        help="DuckDuckGo 最大搜索结果数"
    )
    
    args = parser.parse_args()
    
    # Get query
    search_query = args.query or args.query
    if not search_query and len(sys.argv) > 1 and not sys.argv[1].startswith('-'):
        search_query = sys.argv[1]
    
    if not search_query:
        print("❌ 请提供搜索关键词！")
        parser.print_help()
        sys.exit(1)
    
    # Print header
    print("=" * 60)
    print("🔄 智谱 MCP + DuckDuckGo + 豆包 工作流")
    print("=" * 60)
    
    # Step 1a: Search with Zhipu MCP
    zhipu_result = search_with_zhipu_mcp(search_query, verbose=args.verbose)
    
    # Step 1b: Search with DuckDuckGo
    ddg_result = search_with_duckduckgo(search_query, verbose=args.verbose, max_results=args.ddg_max_results)
    
    # Step 2: Extract with langextract
    final_result = extract_with_langextract(zhipu_result, ddg_result, verbose=args.verbose)
    
    # Save results
    saved_files = save_results(
        final_result,
        args.output_dir,
        save_json=args.save_json,
        verbose=args.verbose
    )
    
    # Final summary
    print("\n" + "=" * 60)
    print("📋 工作流完成")
    print("=" * 60)
    
    if final_result.get("success"):
        print(f"\n✅ 工作流成功！")
        print(f"   查询: {search_query}")
        if final_result.get("zhipu_data", {}).get("success"):
            print(f"   智谱搜索结果: {len(zhipu_result.get('search_results', []))} 条")
        if final_result.get("ddg_data", {}).get("success"):
            print(f"   DuckDuckGo 搜索结果: {len(ddg_result.get('search_results', []))} 条")
        print(f"   保存文件: {len(saved_files)} 个")
        for f in saved_files:
            print(f"   - {Path(f).name}")
        
        # Print extracted info
        print("\n" + "=" * 60)
        print("📝 提取的信息")
        print("=" * 60)
        print("\n" + final_result["extracted_info"])
    else:
        print(f"\n❌ 工作流失败: {final_result.get('error', 'Unknown error')}")
    
    print("\n" + "=" * 60)


if __name__ == '__main__':
    main()
