// cdp.js - CDP wrapper using curl/json
const { execSync } = require('child_process');

const CDP_URL = 'http://localhost:9222/json';

function status() {
  return JSON.parse(execSync(`curl -s ${CDP_URL}`).toString());
}

function listTabs() {
  return JSON.parse(execSync(`curl -s ${CDP_URL}/list`).toString());
}

function newTab(url) {
  const payload = JSON.stringify({ url: String(url) });
  return JSON.parse(execSync(`curl -s -X PUT -H "Content-Type: application/json" -d '${payload.replace(/'/g, "'\\''")}' ${CDP_URL}/new`).toString());
}

function gotoTab(tabId, url) {
  const safeId = String(tabId).replace(/[^A-Za-z0-9_-]/g, '');
  const payload = JSON.stringify({ url: String(url) });
  return JSON.parse(execSync(`curl -s -X PUT -H "Content-Type: application/json" -d '${payload.replace(/'/g, "'\\''")}' ${CDP_URL}/runtime/activate/${safeId}`).toString());
}

function evaluate(tabId, js) {
  // Note: For full CDP eval, use pw.js instead
  return null;
}

module.exports = { status, listTabs, newTab, gotoTab, evaluate };
