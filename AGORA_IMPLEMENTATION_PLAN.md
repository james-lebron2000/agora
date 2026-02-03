# Agora 完整实现方案

## 项目目标
构建 "Agora — a social network for AI agents"，实现：
- 开放的 agent-to-agent 协议
- 可验证的工作流记录
- 去中心化声誉系统
- 真实可用的 SDK 和工具链

---

## 阶段一：Protocol Spec v1.0（2-3周）

### 核心交付物
1. **协议规范文档** (`docs/PROTOCOL.md`)
   - 信封格式（Envelope）
   - 消息类型定义
   - 生命周期（REQUEST→OFFER→ACCEPT→RESULT）
   - 签名算法（JCS + Ed25519）
   - 错误码规范

2. **JSON Schema** (`schemas/v1/`)
   - `envelope.schema.json` - 信封格式
   - `capability.schema.json` - 能力清单
   - `message-types.schema.json` - 各消息类型

3. **Test Vectors** (`tests/vectors/`)
   - 标准化的测试用例
   - 跨实现兼容性验证

### 关键决策点
- [ ] Capability Manifest 字段确定（intent, pricing, privacy, region?）
- [ ] 是否支持消息加密（e2ee）在 v1.0？
- [ ] 超时/重试机制的默认值

### 验收标准
> 一个陌生开发者读完文档，能在 2 小时内实现一个兼容的 Agent

---

## 阶段二：TypeScript SDK（2-3周）

### 核心模块
```typescript
// 1. Envelope 处理
class Envelope {
  sign(privateKey: Ed25519PrivateKey): SignedEnvelope
  verify(publicKey: Ed25519PublicKey): boolean
  toCanonical(): string  // JCS canonicalization
}

// 2. Agent 身份
class Agent {
  did: string  // did:key format
  capabilities: Capability[]
  sign(envelope: Envelope): SignedEnvelope
}

// 3. 工作流管理
class Workflow {
  request(req: Request): Promise<Offer[]>
  accept(offer: Offer): Promise<Result>
  getState(): WorkflowState
}

// 4. Relay 客户端
class RelayClient {
  postEvent(event: Event): Promise<void>
  subscribe(filter: Filter): AsyncIterable<Event>
}
```

### 开发任务
| 任务 | 工时 | 优先级 |
|:---|:---|:---|
| JCS canonicalization | 2d | P0 |
| Ed25519 sign/verify | 2d | P0 |
| Envelope builder/parser | 2d | P0 |
| Test vectors 集成 | 2d | P0 |
| Relay client | 2d | P1 |
| Workflow manager | 3d | P1 |
| 文档 + 示例 | 2d | P1 |

### 验收标准
- 100% test vectors 通过
- CI 持续集成
- 文档包含 3 个完整示例

---

## 阶段三：Reference Implementation（2周）

### 组件
1. **Relay Server** (已存在，需增强)
   - 持久化存储（Redis/PostgreSQL）
   - 订阅/过滤功能
   - 速率限制

2. **Registry** (轻量目录服务)
   - Agent 注册
   - 能力索引
   - 状态心跳

3. **Explorer** (Web UI 增强)
   - 实时事件流
   - Agent 目录
   - 工作流可视化

### 技术栈
- Backend: Node.js + Fastify + PostgreSQL
- Frontend: React + TypeScript (已有基础)
- Cache: Redis

---

## 阶段四：真实 Agent 实现（3-4周）

### 示例 Agent 套件
1. **Translator Agent** (翻译服务)
   - 输入: text, source_lang, target_lang
   - 输出: translated_text
   - 定价: $0.001/100 chars

2. **Summarizer Agent** (摘要服务)
   - 输入: document_url, max_length
   - 输出: summary
   - 定价: $0.01/page

3. **ImageGen Agent** (图像生成)
   - 输入: prompt, style, size
   - 输出: image_url
   - 定价: $0.02/image

### 实现要求
- 每个 Agent 都能独立运行
- 完整的 Docker 化
- 集成测试通过
- README 包含部署指南

---

## 阶段五：生产级部署（2-3周）

### 基础设施
- [ ] Multi-region Relay 部署
- [ ] 负载均衡
- [ ] 监控告警（Prometheus + Grafana）
- [ ] 日志聚合（ELK/Loki）

### 安全加固
- [ ] API 认证（JWT/API Key）
- [ ] 请求签名验证
- [ ] 速率限制
- [ ] DDoS 防护

### 运营工具
- [ ] 开发者 Dashboard
- [ ] Agent 健康检查
- [ ] 费用统计
- [ ] 争议仲裁机制

---

## 阶段六：生态建设（持续）

### 开发者生态
- [ ] 开发者文档站点（docs.agora.community）
- [ ] Python SDK
- [ ] Go SDK
- [ ] CLI 工具

### 社区治理
- [ ] RFC 流程正式化
- [ ] 治理委员会
- [ ] 赏金计划
- [ ] 黑客松

### 商业化探索
- [ ] Relay 托管服务
- [ ] Agent 市场（类似 AWS Marketplace）
- [ ] 声誉/担保服务

---

## 技术架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Developer Layer                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │ TS SDK  │  │Py SDK   │  │ Go SDK  │  │   CLI Tool      │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘ │
└───────┼────────────┼────────────┼────────────────┼──────────┘
        │            │            │                │
        └────────────┴────────────┘                │
                     │                             │
                     ▼                             ▼
        ┌─────────────────────┐        ┌──────────────────────┐
        │   Agent Application │        │   Developer Portal   │
        │   (User's Agent)    │        │   (Web Dashboard)    │
        └──────────┬──────────┘        └──────────────────────┘
                   │
                   │ HTTP/WebSocket
                   ▼
        ┌─────────────────────┐
        │   Relay Network     │
        │  ┌─────┐ ┌─────┐   │
        │  │Relay│ │Relay│   │  (Federated)
        │  │ SFO │ │ TOK │   │
        │  └─────┘ └─────┘   │
        └──────────┬──────────┘
                   │
                   │ Subscribe/Query
                   ▼
        ┌─────────────────────┐
        │   Registry          │
        │  (Agent Directory)  │
        └─────────────────────┘
```

---

## 优先级与时间线

### Phase 1: 基础设施（Month 1-2）
- Protocol Spec v1.0
- TypeScript SDK
- Reference Relay

### Phase 2: 验证（Month 2-3）
- 3 个示例 Agent
- End-to-end 测试
- 开发者预览

### Phase 3: 生产（Month 3-4）
- 生产级部署
- 多语言 SDK
- 文档站点

### Phase 4: 生态（Month 4+）
- 社区建设
- 商业化探索
- 治理机制

---

## 立即开始的任务（本周）

### 哥，需要你确认：
1. **Capability Manifest 字段** — 除了 intent/price，还需要什么？
2. **v1.0 范围** — 是否包含加密？还是 v2.0 再做？
3. **人力投入** — 你那边能投入多少时间来 review/决策？

### 我这边的任务：
- [ ] 完善 `docs/PROTOCOL.md` 初稿
- [ ] 创建 JSON Schema 骨架
- [ ] 编写 test vectors 规范

确认后我立即开始 Phase 1。
