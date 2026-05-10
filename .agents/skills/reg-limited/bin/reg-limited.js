#!/usr/bin/env node

/**
 * RegLimited - 车辆限号查询与提醒工具
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// 城市限号规则映射
const CITY_RULES = {
  '北京': { type: '尾号', weekdays: [1, 2, 3, 4, 5] },
  '上海': { type: '高架', weekdays: [1, 2, 3, 4, 5] },
  '广州': { type: '开四停四', weekdays: [1, 2, 3, 4] },
  '深圳': { type: '高峰', weekdays: [1, 2, 3, 4, 5] },
  '杭州': { type: '尾号', weekdays: [1, 2, 3, 4, 5] },
  '成都': { type: '尾号', weekdays: [1, 2, 3, 4, 5] },
  '天津': { type: '尾号', weekdays: [1, 2, 3, 4, 5] },
  '武汉': { type: '尾号', weekdays: [1, 2, 3, 4, 5] },
  '西安': { type: '尾号', weekdays: [1, 2, 3, 4, 5] },
  '南京': { type: '尾号', weekdays: [1, 2, 3, 4, 5] }
};

// 简单的尾号限行映射 (周一到周五)
const BEIJING_RULES = {
  1: ['1', '6'],
  2: ['2', '7'],
  3: ['3', '8'],
  4: ['4', '9'],
  5: ['5', '0']
};

/**
 * 获取百度搜索结果中的限号信息
 */
function fetchRestrictionFromBaidu(city) {
  return new Promise((resolve, reject) => {
    const searchTerm = `${city}限号情况`;
    const encodedTerm = encodeURIComponent(searchTerm);
    
    // 使用 DuckDuckGo 作为备选
    const url = `https://html.duckduckgo.com/html/?q=${encodedTerm}`;
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // 简单解析搜索结果
        const restrictedNumbers = extractRestrictionNumbers(data, city);
        resolve(restrictedNumbers);
      });
    }).on('error', reject);
  });
}

/**
 * 从搜索结果中提取限行尾号
 */
function extractRestrictionNumbers(html, city) {
  // 尝试匹配各种限号格式
  const patterns = [
    /限行.*?(\d)[、,，].*?(\d)/,
    /限号.*?(\d)[、,，].*?(\d)/,
    /([1-5]).*?([0-9])/,
    /尾号.*?(\d).*?(\d)/
  ];
  
  const text = html.replace(/<[^>]+>/g, ' ').substring(0, 2000);
  
  // 北京特殊处理
  if (city === '北京') {
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return BEIJING_RULES[dayOfWeek] || [];
    }
  }
  
  // 尝试从文本中提取
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return [match[1], match[2]];
    }
  }
  
  return null;
}

/**
 * 获取今日限号
 */
async function getTodayRestrictions(city) {
  const normalizedCity = Object.keys(CITY_RULES).find(c => 
    city.includes(c) || c.includes(city)
  ) || city;
  
  // 尝试获取在线数据
  let numbers = await fetchRestrictionFromBaidu(normalizedCity);
  
  if (!numbers) {
    // 使用本地规则作为后备
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    if (normalizedCity === '北京' && dayOfWeek >= 1 && dayOfWeek <= 5) {
      numbers = BEIJING_RULES[dayOfWeek];
    }
  }
  
  return {
    city: normalizedCity,
    numbers: numbers || [],
    date: new Date().toISOString().split('T')[0]
  };
}

/**
 * 检查车牌是否限行
 */
function checkPlate(restrictions, plate) {
  if (!plate || plate.length === 0) {
    return { isRestricted: false, error: '车牌号不能为空' };
  }
  
  const lastChar = plate.slice(-1).toUpperCase();
  const restrictedNumbers = restrictions.numbers.map(n => n.toUpperCase());
  
  return {
    isRestricted: restrictedNumbers.includes(lastChar),
    lastDigit: lastChar,
    restrictedNumbers,
    city: restrictions.city,
    date: restrictions.date
  };
}

/**
 * 发送通知
 */
function sendNotification(message, channel = 'feishu') {
  try {
    // 通过 OpenClaw 发送消息
    const cmd = `openclaw message send --channel ${channel} --message "${message}"`;
    execSync(cmd, { encoding: 'utf-8' });
    return true;
  } catch (e) {
    console.error('发送通知失败:', e.message);
    return false;
  }
}

/**
 * CLI 入口
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'query':
      handleQuery(args);
      break;
    case 'check':
      handleCheck(args);
      break;
    case 'add':
      handleAdd(args);
      break;
    case 'list':
      handleList(args);
      break;
    case 'remove':
      handleRemove(args);
      break;
    default:
      showHelp();
  }
}

async function handleQuery(args) {
  const city = extractArg(args, '--city') || '北京';
  const restrictions = await getTodayRestrictions(city);
  console.log(JSON.stringify({
    success: true,
    data: restrictions
  }, null, 2));
}

async function handleCheck(args) {
  const city = extractArg(args, '--city') || '北京';
  const plate = extractArg(args, '--plate');
  
  if (!plate) {
    console.log(JSON.stringify({
      success: false,
      error: '请提供车牌号 --plate'
    }));
    return;
  }
  
  const restrictions = await getTodayRestrictions(city);
  const result = checkPlate(restrictions, plate);
  
  console.log(JSON.stringify({
    success: true,
    data: result
  }, null, 2));
}

function handleAdd(args) {
  const city = extractArg(args, '--city');
  const plate = extractArg(args, '--plate');
  const time = extractArg(args, '--time') || '07:00';
  
  if (!city || !plate) {
    console.log(JSON.stringify({
      success: false,
      error: '请提供城市和车牌号'
    }));
    return;
  }
  
  // 保存配置到文件
  const configPath = process.env.HOME + '/.reg-limited/config.json';
  const fs = require('fs');
  
  let config = { reminders: [] };
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath));
    }
  } catch (e) {}
  
  const reminder = {
    id: Date.now().toString(),
    city,
    plate,
    time,
    created: new Date().toISOString()
  };
  
  config.reminders.push(reminder);
  
  // 确保目录存在
  const dir = require('path').dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(JSON.stringify({
    success: true,
    data: { reminder, message: '已添加限号提醒' }
  }, null, 2));
}

function handleList(args) {
  const fs = require('fs');
  const configPath = process.env.HOME + '/.reg-limited/config.json';
  
  let config = { reminders: [] };
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath));
    }
  } catch (e) {}
  
  console.log(JSON.stringify({
    success: true,
    data: config.reminders
  }, null, 2));
}

function handleRemove(args) {
  const id = extractArg(args, '--id');
  
  if (!id) {
    console.log(JSON.stringify({
      success: false,
      error: '请提供要删除的提醒ID'
    }));
    return;
  }
  
  const fs = require('fs');
  const configPath = process.env.HOME + '/.reg-limited/config.json';
  
  let config = { reminders: [] };
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath));
    }
  } catch (e) {}
  
  config.reminders = config.reminders.filter(r => r.id !== id);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(JSON.stringify({
    success: true,
    message: '已删除提醒'
  }));
}

function extractArg(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
}

function showHelp() {
  console.log(`
RegLimited - 车辆限号查询与提醒工具

用法:
  reg-limited query --city <城市>     查询今日限号
  reg-limited check --city <城市> --plate <车牌号>  检查车牌是否限行
  reg-limited add --city <城市> --plate <车牌号> --time <时间>  添加提醒
  reg-limited list                    列出所有提醒
  reg-limited remove --id <ID>         删除提醒

示例:
  reg-limited query --city 北京
  reg-limited check --city 北京 --plate 京A12345
  reg-limited add --city 北京 --plate 京A12345 --time "07:00"
`);
}

main();
