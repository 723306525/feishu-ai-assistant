const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const APP_ID = 'cli_a923fe15f53c9bc7';
const APP_SECRET = 'h3sepXWkyTYjYZgklxDaVhLo5ezR5YGx';

let tenantToken = null;
let tokenExpire = 0;

async function getTenantToken() {
  const now = Date.now();
  if (tenantToken && now < tokenExpire - 300000) return tenantToken;
  try {
    const r = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      { app_id: APP_ID, app_secret: APP_SECRET },
      { headers: { 'Content-Type': 'application/json' } });
    if (r.data.code === 0) {
      tenantToken = r.data.tenant_access_token;
      tokenExpire = now + (r.data.expire || 7200) * 1000;
      return tenantToken;
    }
  } catch (e) { console.log(e.message); }
  return null;
}

async function replyMessage(messageId, content) {
  const token = await getTenantToken();
  if (!token) return;
  await axios.post(`https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/reply`,
    { msg_type: 'text', content: JSON.stringify({ text: content }) },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
}

function processAI(message) {
  const msg = message.toLowerCase().trim();
  if (['你好', 'hello', 'hi', '嗨'].some(g => msg.includes(g))) {
    return '你好！我是飞书AI助手，已成功连接！🎉\n\n告诉我你需要做什么？';
  }
  if (msg.includes('帮助') || msg.includes('help')) {
    return '🤖 我可以帮你：\n📝 回答问题\n📊 数据分析\n🌐 网页操作\n📄 文件处理\n💬 翻译文字\n\n直接告诉我！';
  }
  return `收到任务：「${message}」✅ 任务已记录！\n\n我是飞书AI助手，7×24小时运行中！`;
}

app.post('/webhook', async (req, res) => {
  const data = req.body;
  if (data.type === 'url_verification') return res.json({ challenge: data.challenge });
  
  const event = data.event || {};
  if (event.type === 'message') {
    const message = event.message || {};
    const messageId = message.message_id;
    try {
      const content = JSON.parse(message.content || '{}');
      const text = content.text || '';
      await replyMessage(messageId, '🔄 收到任务，正在处理...');
      await replyMessage(messageId, processAI(text));
    } catch (e) { console.log(e.message); }
  }
  res.json({ code: 0, msg: 'success' });
});

app.get('/', (req, res) => res.json({ status: 'ok', service: '飞书AI助手' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`运行中 ${PORT}`); getTenantToken(); });
