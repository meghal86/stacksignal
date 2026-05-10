"""
LangExtract 多模型 Provider 封装

支持的模型:
- 智谱 AI (GLM): glm-4-flash 等
- 火山引擎 ARK: doubao, kimi 等
"""

import os

# Try to import langextract - if not available, this module won't work
try:
    import langextract as lx
    HAS_LANGEXTRACT = True
except ImportError:
    HAS_LANGEXTRACT = False
    lx = None

# Try to import OpenAI-compatible clients
try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

try:
    from zhipuai import ZhipuAI
    HAS_ZHIPUAI = True
except ImportError:
    HAS_ZHIPUAI = False


# Only register providers if langextract is available
if HAS_LANGEXTRACT and lx:
    @lx.providers.registry.register(r'^glm', r'^zhipu', priority=10)
    class ZhipuLanguageModel(lx.inference.BaseLanguageModel):
        """Language model for Zhipu AI (GLM) models."""
        
        def __init__(self, model_id: str, api_key: str = None, base_url: str = None, **kwargs):
            super().__init__()
            self.model_id = model_id or "glm-4-flash"
            self.api_key = api_key or os.environ.get('ZHIPUAI_API_KEY') or os.environ.get('LANGEXTRACT_API_KEY')
            self.base_url = base_url or "https://open.bigmodel.cn/api/paas/v4"
            
            # Use zhipuai if available, otherwise use OpenAI-compatible client
            if HAS_ZHIPUAI:
                self.client = ZhipuAI(api_key=self.api_key, base_url=self.base_url)
                self._use_zhipuai = True
            elif HAS_OPENAI:
                self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
                self._use_zhipuai = False
            else:
                raise ImportError("Either zhipuai or openai package is required")

        def infer(self, batch_prompts, **kwargs):
            # Pass ALL kwargs to the API - don't filter!
            api_kwargs = kwargs.copy()
            
            for prompt in batch_prompts:
                if self._use_zhipuai:
                    response = self.client.chat.completions.create(
                        model=self.model_id,
                        messages=[{"role": "user", "content": prompt}],
                        **api_kwargs
                    )
                else:
                    response = self.client.chat.completions.create(
                        model=self.model_id,
                        messages=[{"role": "user", "content": prompt}],
                        **api_kwargs
                    )
                output = response.choices[0].message.content
                yield [lx.inference.ScoredOutput(score=1.0, output=output)]


    @lx.providers.registry.register(r'^doubao', r'^ark', r'^kimi', priority=10)
    class ArkLanguageModel(lx.inference.BaseLanguageModel):
        """Language model for Volcengine ARK (Doubao, Kimi) models."""
        
        def __init__(self, model_id: str, api_key: str = None, base_url: str = None, **kwargs):
            super().__init__()
            self.model_id = model_id or "doubao-seed-2-0-code"
            self.api_key = api_key or os.environ.get('ARK_API_KEY') or os.environ.get('LANGEXTRACT_API_KEY')
            self.base_url = base_url or "https://ark.cn-beijing.volces.com/api/v3"
            
            # ARK uses OpenAI-compatible API
            if not HAS_OPENAI:
                raise ImportError("openai package is required for ARK models")
            
            self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)

        def infer(self, batch_prompts, **kwargs):
            # Pass ALL kwargs to the API - don't filter!
            api_kwargs = kwargs.copy()
            
            for prompt in batch_prompts:
                response = self.client.chat.completions.create(
                    model=self.model_id,
                    messages=[{"role": "user", "content": prompt}],
                    **api_kwargs
                )
                output = response.choices[0].message.content
                yield [lx.inference.ScoredOutput(score=1.0, output=output)]
