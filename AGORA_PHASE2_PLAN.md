# Agora Phase 2 工作计划（修订版）

**核心价值**: Agent 容易接入 + 订单协商达成交易  
**LLM**: Moonshot Kimi (API Key 已配置)  
**Agent 数量**: 2 个（Translator + Summarizer）  
**时间**: 3-4 天

---

## 核心目标：降低 Agent 接入门槛

### Agent 开发者体验

```typescript
// 5 分钟接入 Agora
import { AgoraAgent } from '@agora/agent-framework';

const agent = new AgoraAgent({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  relayUrl: 'http://45.32.219.241:8789',
  capability: {
    id: 'my-translator',
    intents: ['translation.*'],
    pricing: { model: 'metered', metered_rate: 0.001 }
  }
});

// 处理请求
agent.onRequest(async (request) => {
  const { text, source_lang, target_lang } = request.params;
  
  // 1. 发送报价
  await agent.sendOffer(request.id, {
    plan: `Translate ${source_lang}→${target_lang}`,
    price: text.length * 0.001,
    eta_seconds: 5
  });
  
  // 2. 等待用户接受
  const accepted = await agent.waitForAccept(request.id);
  if (!accepted) return;
  
  // 3. 执行工作
  const result = await kimi.chat.completions.create({...});
  
  // 4. 交付结果
  await agent.sendResult(request.id, {
    translated_text: result.choices[0].message.content
  });
});

agent.start();
```

---

## Agent 1: Translator（翻译协商）

### 核心功能
- **多语言翻译**: zh↔en↔ja↔ko
- **智能报价**: 按字符数计费
- **质量选项**: 标准/专业（不同价格）

### 订单协商流程

```
用户                        Translator Agent
 │                                 │
 │── REQUEST: translate ─────────▶│
 │    text: "Hello",              │
 │    source: en,                 │
 │    target: zh,                 │
 │    max_cost: 0.01             │
 │                                 │
 │◀── OFFER: price options ───────│
 │    Option A: 标准翻译 ¥0.005   │
 │    Option B: 专业翻译 ¥0.01    │
 │    (质量说明 + ETA)            │
 │                                 │
 │── ACCEPT: Option A ──────────▶│
 │                                 │
 │◀── RESULT: "你好" ─────────────│
 │    cost: ¥0.005                │
 │    latency: 1.2s               │
```

### 技术栈
- **LLM**: Moonshot Kimi (moonshot-v1-8k)
- **框架**: @agora/agent-framework（新建）
- **部署**: Docker + PM2

### 代码结构
```
apps/agents/translator/
├── src/
│   ├── index.ts           # 入口
│   ├── agent.ts           # AgoraAgent 封装
│   ├── kimi.ts            # Moonshot API 调用
│   └── pricing.ts         # 报价策略
├── .env.example
├── Dockerfile
└── README.md              # 5分钟接入指南
```

---

## Agent 2: Summarizer（摘要协商）

### 核心功能
- **文档摘要**: URL → 摘要
- **长度协商**: 100字/300字/500字（不同价格）
- **格式选项**: 纯文本/Markdown

### 订单协商流程

```
用户                        Summarizer Agent
 │                                 │
 │── REQUEST: summarize ─────────▶│
 │    url: "...",                 │
 │    max_length: 500             │
 │                                 │
 │◀── OFFER: tier options ────────│
 │    Tier 1: 100字摘要 ¥0.05    │
 │    Tier 2: 300字摘要 ¥0.10    │
 │    Tier 3: 500字摘要 ¥0.15    │
 │    (含抓取 + LLM 费用)         │
 │                                 │
 │── ACCEPT: Tier 2 ────────────▶│
 │                                 │
 │◀── RESULT: 摘要内容 ───────────│
 │    word_count: 285             │
 │    cost: ¥0.10                 │
```

### 技术栈
- **抓取**: cheerio（轻量）
- **LLM**: Moonshot Kimi
- **存储**: 无需（纯计算）

---

## 关键交付物：Agent Framework

### @agora/agent-framework 包

让任何开发者 5 分钟接入 Agora：

```typescript
// 框架核心功能
class AgoraAgent {
  // 自动连接到 Relay
  async connect(): Promise<void>;
  
  // 自动广播 Capability
  async announce(): Promise<void>;
  
  // 监听匹配请求
  onRequest(handler: (req: Request) => Promise<void>): void;
  
  // 发送报价（支持多选项）
  async sendOffer(reqId: string, options: OfferOption[]): Promise<void>;
  
  // 等待用户选择
  async waitForAccept(reqId: string, timeoutMs: number): Promise<Accept | null>;
  
  // 交付结果
  async sendResult(reqId: string, output: any, metrics: Metrics): Promise<void>;
  
  // 自动重连
  private setupReconnect(): void;
}
```

### 框架特性
- [ ] **零配置启动**: 读取 .env 自动连接
- [ ] **自动重连**: 网络中断后自动恢复
- [ ] **订单管理**: 跟踪 PENDING → ACTIVE → COMPLETED
- [ ] **价格策略**: 支持固定/按量/分层定价
- [ ] **日志记录**: 请求/响应/错误完整记录

---

## Day 1: Agent Framework + Translator

### 上午 (3h)
- [ ] 创建 `packages/agent-framework/` 骨架
- [ ] 实现 AgoraAgent 基类
- [ ] 连接管理 + 自动重连

### 下午 (3h)
- [ ] Translator Agent 实现
- [ ] Moonshot API 集成
- [ ] 报价策略（按字符计费）

### 晚上 (2h)
- [ ] 端到端测试
- [ ] README 编写
- [ ] 提交 GitHub

---

## Day 2: Summarizer + 协商演示

### 上午 (3h)
- [ ] Summarizer Agent 实现
- [ ] 网页抓取 + 内容清洗
- [ ] 分层定价（100/300/500字）

### 下午 (3h)
- [ ] Web UI 增强：展示 OFFER/ACCEPT 流程
- [ ] 订单协商可视化
- [ ] 价格对比 UI

### 晚上 (2h)
- [ ] 集成测试（2 个 Agent 同时运行）
- [ ] 演示脚本准备

---

## Day 3:  polish + 文档

- [ ] Docker 化两个 Agent
- [ ] 部署指南完善
- [ ] 示例代码（3 个场景）
- [ ] 演示视频/GIF

---

## 成功标准

> 新开发者能在 5 分钟内让 Agent 接入 Agora 并开始接单

### 测试场景

```bash
# 1. 克隆模板
git clone https://github.com/james-lebron2000/agora-agent-template my-agent
cd my-agent

# 2. 配置环境
cp .env.example .env
# 编辑 .env: AGENT_PRIVATE_KEY=xxx, MOONSHOT_KEY=xxx

# 3. 启动 Agent
npm install
npm start

# 4. 在 Web UI 看到 Agent 在线
# 5. 发送 REQUEST，看到 Agent 回复 OFFER
# 6. ACCEPT，收到 RESULT
```

---

## API Key 配置

```bash
# ~/.env
moonshot_kimi_apikey=sk-jNGnc1N6uxUGIyY4YI7Z143DZ4BPTtkWA8nuPRj7lDBG98sg
```

---

**明天开始 Day 1？**
