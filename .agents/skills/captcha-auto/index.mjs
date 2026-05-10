#!/usr/bin/env node
/**
 * 通用验证码自动识别 Skill - 混合模式 v1.0.2
 * 策略：本地 OCR 优先 → 视觉模型降级 → 智能填写 → 失败则告知用户手动填写
 */

import { chromium } from 'playwright-core';
import { createWorker } from 'tesseract.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const HOME_DIR = os.homedir();
const CONFIG_PATH = path.join(HOME_DIR, '.openclaw', 'openclaw.json');
const WORKSPACE_DIR = path.join(HOME_DIR, '.openclaw', 'workspace');

function getChromePath() {
  const platform = os.platform();
  switch (platform) {
    case 'darwin':
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'linux':
      const linuxPaths = ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome', '/snap/bin/chromium'];
      for (const p of linuxPaths) {
        if (fs.existsSync(p)) return p;
      }
      return linuxPaths[0];
    case 'win32':
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    default:
      throw new Error(`不支持的操作系统：${platform}`);
  }
}

function loadConfig(overrides = {}) {
  if (overrides.apiKey) {
    return {
      baseUrl: overrides.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: overrides.apiKey,
      model: overrides.model || 'qwen3-vl-plus'
    };
  }
  
  const envApiKey = process.env.VISION_API_KEY || process.env.QWEN_API_KEY;
  if (envApiKey) {
    return {
      baseUrl: process.env.VISION_BASE_URL || process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: envApiKey,
      model: process.env.VISION_MODEL || process.env.QWEN_MODEL || 'qwen3-vl-plus'
    };
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const visionConfig = 
      config.models?.providers?.bailian ||
      config.models?.providers?.aliyun ||
      config.models?.providers?.dashscope ||
      config.models?.providers?.openai;
    
    if (!visionConfig) {
      throw new Error('配置文件中缺少视觉模型配置');
    }
    
    return {
      baseUrl: visionConfig.baseUrl?.replace('/v1', '/compatible-mode/v1') || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: visionConfig.apiKey,
      model: 'qwen3-vl-plus'
    };
  } catch (e) {
    throw new Error(`无法加载配置：${e.message}\n\n请通过以下方式之一配置:\n1. 环境变量：VISION_API_KEY, VISION_BASE_URL, VISION_MODEL\n2. OpenClaw 配置：${CONFIG_PATH}\n3. 命令行参数：--api-key, --base-url, --model`);
  }
}

async function recognizeWithTesseract(screenshotPath) {
  console.log('🔍 尝试本地 Tesseract OCR 识别...');
  
  const worker = await createWorker('eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        console.log(`   识别进度：${(m.progress * 100).toFixed(0)}%`);
      }
    }
  });
  
  try {
    const { data: { text, confidence } } = await worker.recognize(screenshotPath);
    const cleanedText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
    
    console.log(`   识别结果："${cleanedText}" (置信度：${confidence.toFixed(1)}%)`);
    await worker.terminate();
    
    if (confidence < 60 || cleanedText.length === 0) {
      console.log('   ⚠️ 本地 OCR 置信度过低，需要降级到视觉模型');
      return { success: false, text: null, confidence, method: 'tesseract' };
    }
    
    return { success: true, text: cleanedText, confidence, method: 'tesseract' };
    
  } catch (error) {
    console.log(`   ❌ 本地 OCR 失败：${error.message}`);
    await worker.terminate();
    return { success: false, text: null, error: error.message, method: 'tesseract' };
  }
}

async function analyzePageWithVision(screenshotPath, config) {
  console.log('🧠 降级到视觉模型识别...');
  
  const imageBuffer = fs.readFileSync(screenshotPath);
  const base64Image = imageBuffer.toString('base64');

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `这是一个网页截图，请分析：
1. 找出验证码图片中的文字内容（只返回验证码文字，不要其他描述）
2. 描述验证码图片在页面中的大概位置
3. 找出验证码输入框的位置
4. 找出提交/验证按钮的位置和文字

请用 JSON 格式返回：
{
  "captchaText": "验证码文字",
  "captchaLocation": "位置描述",
  "inputLocation": "输入框位置",
  "buttonLocation": "按钮位置",
  "buttonText": "按钮文字"
}`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${base64Image}` }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`API 错误：${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {}
  
  return { rawText: content };
}

async function cropCaptchaRegion(page, screenshotPath, outputPrefix) {
  try {
    const captchaImgSelectors = [
      'img[alt*="captcha" i]',
      'img[alt*="验证码" i]',
      'img[id*="captcha" i]',
      'img[class*="captcha" i]'
    ];
    
    for (const selector of captchaImgSelectors) {
      const img = page.locator(selector).first();
      if (await img.count() > 0) {
        const box = await img.boundingBox();
        if (box) {
          const croppedPath = path.join(WORKSPACE_DIR, `${outputPrefix}_captcha_cropped.png`);
          await page.screenshot({ 
            path: croppedPath, 
            clip: { x: box.x, y: box.y, width: box.width, height: box.height }
          });
          console.log(`✅ 已裁剪验证码区域：${outputPrefix}_captcha_cropped.png`);
          return croppedPath;
        }
      }
    }
  } catch (e) {
    console.log('⚠️ 无法裁剪验证码区域，使用全屏截图');
  }
  
  return screenshotPath;
}

async function fillInContext(context, captchaText, contextName = '主页面') {
  const preciseSelectors = [
    'input[placeholder*="验证码"]',
    'input[placeholder*="captcha" i]',
    'input[name*="captcha" i]',
    'input[id*="captcha" i]',
    'input[aria-label*="验证码"]',
    'input[aria-label*="captcha" i]'
  ];

  for (const selector of preciseSelectors) {
    const inputs = await context.locator(selector).all();
    for (const input of inputs) {
      try {
        const box = await input.boundingBox();
        if (box && box.width > 30 && box.width < 300 && box.height > 20) {
          const isVisible = await input.isVisible();
          if (!isVisible) continue;
          
          await input.fill(captchaText);
          console.log(`✅ 已填写到输入框 (${contextName}, ${selector})`);
          return true;
        }
      } catch (e) {}
    }
  }

  console.log(`   ⚠️ 精确匹配失败，尝试通用 type="text" 选择器...`);
  const textInputs = await context.locator('input[type="text"]').all();
  
  for (const input of textInputs) {
    try {
      const box = await input.boundingBox();
      if (box && box.width > 50 && box.width < 300 && box.height > 15) {
        const isVisible = await input.isVisible();
        if (!isVisible) continue;
        
        const placeholder = await input.getAttribute('placeholder');
        const name = await input.getAttribute('name');
        const id = await input.getAttribute('id');
        
        const excludeKeywords = ['search', 'query', 'width', 'height', 'email'];
        const text = (placeholder + ' ' + name + ' ' + id).toLowerCase();
        const isExcluded = excludeKeywords.some(kw => text.includes(kw));
        
        if (isExcluded) {
          console.log(`   ⚠️ 跳过可能的非验证码输入框：${id || name || 'unknown'}`);
          continue;
        }
        
        await input.fill(captchaText);
        console.log(`✅ 已填写到输入框 (${contextName}, id="${id || ''}", name="${name || ''}")`);
        return true;
      }
    } catch (e) {}
  }
  
  return false;
}

async function fillAndSubmit(page, captchaText, outputPrefix) {
  console.log('\n🔍 查找验证码输入框...');
  
  let inputFound = await fillInContext(page, captchaText, '主页面');
  
  if (!inputFound) {
    console.log('⚠️ 主页面未找到输入框，检查 iframe...');
    const frames = page.frames();
    console.log(`   找到 ${frames.length} 个 frame`);
    
    for (const frame of frames) {
      if (frame === page.mainFrame()) continue;
      
      console.log(`   尝试 iframe: ${frame.name() || frame.url().substring(0, 50)}`);
      inputFound = await fillInContext(frame, captchaText, 'iframe');
      if (inputFound) {
        console.log('✅ 在 iframe 中找到并填写输入框');
        break;
      }
    }
    
    if (!inputFound) {
      console.log('⚠️ iframe 中也未找到输入框');
    }
  }

  const filledPath = path.join(WORKSPACE_DIR, `${outputPrefix}_filled.png`);
  await page.screenshot({ path: filledPath, fullPage: true });
  if (inputFound) {
    console.log(`✅ 填写后截图：${outputPrefix}_filled.png`);
  } else {
    console.log(`⚠️ 未找到输入框，已截图：${outputPrefix}_filled.png`);
    console.log(`💡 验证码已识别，请手动填写并提交`);
  }

  console.log('\n🔍 查找验证按钮...');
  const buttonSelectors = [
    'button:has-text("Validate")',
    'button:has-text("Submit")',
    'button:has-text("验证")',
    'button:has-text("提交")',
    'button:has-text("登录")',
    'input[type="submit"]',
    'button[type="submit"]'
  ];

  let buttonFound = false;
  for (const selector of buttonSelectors) {
    const buttons = await page.locator(selector).all();
    for (const btn of buttons) {
      try {
        const text = await btn.textContent().catch(() => '');
        const value = await btn.getAttribute('value').catch(() => '');
        
        if (/validate|submit|verify|确认 | 提交 | 验证 | 登录/i.test(text + value)) {
          await btn.click();
          console.log(`✅ 已点击：${selector} (${text || value})`);
          buttonFound = true;
          break;
        }
      } catch (e) {}
    }
    if (buttonFound) break;
  }

  if (!buttonFound) {
    console.log('⚠️ 未找到明显按钮，尝试第一个提交按钮...');
    const firstBtn = page.locator('button, input[type="submit"]').first();
    if (await firstBtn.count() > 0) {
      await firstBtn.click();
      console.log('✅ 已点击第一个按钮');
      buttonFound = true;
    }
  }

  return { inputFound, buttonFound };
}

async function recognizeCaptcha(options = {}) {
  const {
    url,
    outputPrefix = 'smart_captcha',
    apiKey,
    baseUrl,
    model,
    skipLocal = false
  } = options;

  const config = loadConfig({ apiKey, baseUrl, model });

  console.log('⚠️  安全提示：本技能会截取网页截图并发送到阿里云 API');
  console.log('   请勿在包含敏感信息的页面使用');
  console.log('');
  console.log('🤖 Captcha Auto Skill v1.0.2 (混合模式)');
  console.log('=' .repeat(60));
  console.log('🚀 智能验证码识别 - 本地 OCR + 视觉模型降级');
  console.log('=' .repeat(60));
  console.log(`目标：${url}`);
  console.log(`系统：${os.platform()}`);
  console.log(`视觉模型：${config.model}`);
  console.log('=' .repeat(60));

  const executablePath = getChromePath();
  console.log(`浏览器：${executablePath}`);

  if (!fs.existsSync(executablePath)) {
    console.error(`❌ 未找到 Chrome: ${executablePath}`);
    return { success: false, error: 'Chrome not found', screenshots: {} };
  }

  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  const screenshots = {};
  let recognitionMethod = null;

  try {
    console.log('\n📄 打开页面...');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('\n📸 截图页面...');
    screenshots.page = path.join(WORKSPACE_DIR, `${outputPrefix}_page.png`);
    await page.screenshot({ path: screenshots.page, fullPage: true });
    console.log(`✅ 页面已截图：${outputPrefix}_page.png`);

    const captchaCropPath = await cropCaptchaRegion(page, screenshots.page, outputPrefix);

    let captchaText = null;
    let analysis = null;
    let finalScreenshotPath = captchaCropPath;

    if (!skipLocal) {
      const localResult = await recognizeWithTesseract(finalScreenshotPath);
      
      if (localResult.success) {
        captchaText = localResult.text;
        recognitionMethod = 'tesseract';
        console.log(`✅ 本地 OCR 成功：${captchaText}`);
      } else {
        console.log('⚠️ 本地 OCR 不可靠，需要降级到视觉模型...');
        console.log('📸 重新截图（确保验证码未刷新）...');
        
        await page.waitForTimeout(1000);
        screenshots.page = path.join(WORKSPACE_DIR, `${outputPrefix}_page.png`);
        await page.screenshot({ path: screenshots.page, fullPage: true });
        finalScreenshotPath = await cropCaptchaRegion(page, screenshots.page, outputPrefix);
      }
    }

    if (!captchaText) {
      try {
        analysis = await analyzePageWithVision(finalScreenshotPath, config);
        captchaText = analysis.captchaText || '';
        
        if (!captchaText) {
          throw new Error('视觉模型未能识别验证码文字');
        }
        
        recognitionMethod = 'vision';
        console.log(`✅ 视觉模型识别成功：${captchaText}`);
        console.log('📊 分析结果:');
        console.log(JSON.stringify(analysis, null, 2));
        
      } catch (visionError) {
        throw new Error(`视觉模型识别失败：${visionError.message}`);
      }
    }

    const { inputFound, buttonFound } = await fillAndSubmit(page, captchaText, outputPrefix);

    console.log('\n⏳ 等待结果...');
    await page.waitForTimeout(4000);

    screenshots.result = path.join(WORKSPACE_DIR, `${outputPrefix}_result.png`);
    await page.screenshot({ path: screenshots.result, fullPage: true });
    console.log(`✅ 结果截图：${outputPrefix}_result.png`);

    console.log('');
    console.log('='.repeat(60));
    console.log('🎉 智能验证码识别完成！');
    console.log(`识别内容：${captchaText}`);
    console.log(`识别方式：${recognitionMethod === 'tesseract' ? '本地 Tesseract OCR' : '视觉模型'}`);
    
    if (!inputFound) {
      console.log('⚠️ 自动填写失败，请手动填写验证码');
    }
    console.log('='.repeat(60));

    return { 
      success: true, 
      text: captchaText, 
      method: recognitionMethod,
      inputFilled: inputFound,
      buttonClicked: buttonFound,
      analysis,
      screenshots,
      metadata: {
        url,
        model: config.model,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    screenshots.error = path.join(WORKSPACE_DIR, `${outputPrefix}_error.png`);
    await page.screenshot({
      path: screenshots.error,
      fullPage: true
    });
    return { success: false, error: error.message, screenshots };
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
智能验证码自动识别 Skill v1.0.2 (混合模式)

用法:
  node scripts/run.mjs --url="<url>" [选项]

选项:
  --url=<url>         目标页面 URL（必需）
  --prefix=<prefix>   输出文件前缀（可选，默认：smart_captcha）
  --api-key=<key>     视觉模型 API Key（可选，覆盖环境变量）
  --base-url=<url>    API 服务端点（可选）
  --model=<model>     模型名称（可选，默认：qwen3-vl-plus）
  --skip-local        跳过本地 OCR，直接使用视觉模型
  --json              输出 JSON 格式（方便程序解析）
  --help              显示帮助

识别策略:
  1. 本地 Tesseract OCR（快速、零成本）- 仅识别，不提交
  2. 置信度 < 60% → 重新截图 → 视觉模型降级
  3. 智能填写（主页面 → iframe）
  4. 填写失败 → 告知用户手动填写

必需配置:
  - 环境变量：VISION_API_KEY, VISION_BASE_URL, VISION_MODEL
  - 或 OpenClaw 配置：~/.openclaw/openclaw.json
  - 或命令行参数：--api-key, --base-url, --model
`);
    return;
  }

  const options = {};
  for (const arg of args) {
    if (arg.startsWith('--url=')) options.url = arg.substring(6);
    if (arg.startsWith('--prefix=')) options.outputPrefix = arg.substring(9);
    if (arg.startsWith('--api-key=')) options.apiKey = arg.substring(10);
    if (arg.startsWith('--base-url=')) options.baseUrl = arg.substring(11);
    if (arg.startsWith('--model=')) options.model = arg.substring(8);
    if (arg === '--skip-local') options.skipLocal = true;
    if (arg === '--json') options.json = true;
  }

  if (!options.url) {
    console.error('❌ 错误：缺少必需参数 --url');
    console.error('使用 --help 查看帮助');
    process.exit(1);
  }

  const useJson = options.json || process.env.JSON_OUTPUT === '1';
  
  if (!useJson) {
    console.log('🤖 Captcha Auto Skill v1.0.2 (混合模式)');
  }
  
  try {
    const result = await recognizeCaptcha(options);
    
    if (useJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('');
      console.log('='.repeat(60));
      if (result.success) {
        console.log(`✅ 完成！验证码：${result.text}`);
        console.log(`识别方式：${result.method === 'tesseract' ? '本地 Tesseract OCR' : '视觉模型'}`);
        if (!result.inputFilled) {
          console.log('⚠️ 自动填写失败，请手动填写验证码');
        }
      } else {
        console.log(`❌ 失败：${result.error}`);
      }
    }
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    if (useJson) {
      console.log(JSON.stringify({ success: false, error: error.message }));
    } else {
      console.error('❌ 异常:', error.message);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { recognizeCaptcha };
