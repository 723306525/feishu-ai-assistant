/**
 * 飞书AI助手 - Cloudflare Workers版本
 */
const APP_ID = 'cli_a923fe15f53c9bc7';
const APP_SECRET = 'h3sepXWkyTYjYZgklxDaVhLo5ezR5YGx';

let cachedToken = null;
let tokenExpire = 0;

// 获取飞书Token
async function getTenantToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpire - 300000) {
    return cachedToken;
  }
  
  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    
    const data = await response.json();
    
    if (data.code === 0) {
      cachedToken = data.tenant_access_token;
      tokenExpire = now + (data.expire || 7200) * 1000;
      return cachedToken;
    }
  } catch (e) {
    console.log('获取Token失败:', e.message);
  }
  return null;
}

// 回复消息
async function replyMessage(messageId, content) {
  const token = await getTenantToken();
  if (!token) return;
  
  await fetch(`https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/reply`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      msg_type: 'text',
      content: JSON.stringify({ text: content })
    })
  });
}

// AI处理函数
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

// 主请求处理
async function handleRequest(request) {
  if (request.method === 'POST') {
    try {
      const data = await request.json();
      
      // URL验证
      if (data.type === 'url_verification') {
        return new Response(JSON.stringify({ challenge: data.challenge }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 处理消息
      const event = data.event || {};
      if (event.type === 'message') {
        const message = event.message || {};
        const messageId = message.message_id;
        
        try {
          const content = JSON.parse(message.content || '{}');
          const text = content.text || '';
          
          console.log('收到消息:', text);
          await replyMessage(messageId, '🔄 收到任务，正在处理...');
          const response = processAI(text);
          await replyMessage(messageId, response);
          
        } catch (e) {
          console.log('处理错误:', e.message);
        }
      }
      
    } catch (e) {
      console.log('解析错误:', e.message);
    }
  }
  
  return new Response(JSON.stringify({ code: 0, msg: 'success' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// 健康检查
async function handleHealthCheck() {
  return new Response(JSON.stringify({ 
    status: 'ok', 
    service: '飞书AI助手'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Cloudflare Workers入口
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/' || url.pathname === '') {
      return handleHealthCheck
      await replyMessage(messageId, '🔄 收到任务，正在处理...');
      await replyMessage(messageId, processAI(text));
    } catch (e) { console.log(e.message); }
  }
  res.json({ code: 0, msg: 'success' });
});

app.get('/', (req, res) => res.json({ status: 'ok', service: '飞书AI助手' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`运行中 ${PORT}`); getTenantToken(); });
