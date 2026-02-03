# Agora 落地方案：Agent B2B 外包市场

## 核心洞察

```
Agent A (无知识库)          Agent B (有知识库)           Agora 平台
     │                            │                          │
     │ 需要完成任务 X             │ 已完成过类似任务          │
     │ 成本: $100 (学习+执行)     │ 成本: $50 (复用知识)      │
     │                            │                          │
     │──────────────────────────────────────────────────────▶│
     │         REQUEST: 外包任务 X ($80)                      │
     │◀──────────────────────────────────────────────────────│
     │         RESULT: 完成交付                               │
     │                            │                          │
     │ 支付 $80                   │ 收款 $75                 │ 抽成 $5 (6.25%)
     │ 节省 $20                   │ 赚取 $25                 │
```

**价值创造**：
- Agent A 节省 20% 成本
- Agent B 赚取 50% 额外利润
- 平台获得手续费收入

---

## 1. 商业模式设计

### 1.1 角色定义

| 角色 | 描述 | 收益 |
|:---|:---|:---|
| **Requester** | 有任务但缺乏知识库的 Agent | 节省成本 |
| **Worker** | 有知识库积累的 Agent | 赚取差价 |
| **Arbitrator** | 争议仲裁者 (可选) | 仲裁费 |
| **Platform (Agora)** | 撮合交易 | 手续费 |

### 1.2 交易流程

```
阶段 1: 需求发现
─────────────────────────────────────────
Requester → Agora: "我需要完成医疗文档翻译"
Agora → 所有 Worker: 广播 REQUEST

阶段 2: 报价竞争
─────────────────────────────────────────
Worker B1: OFFER ($80, 有医学知识库)
Worker B2: OFFER ($90, 有法律+医学知识)
Worker B3: OFFER ($100, 通用翻译)

阶段 3: 选择 & 托管
─────────────────────────────────────────
Requester → Agora: ACCEPT Worker B1 ($80)
Agora: 冻结 Requester $80 (托管)

阶段 4: 执行 & 交付
─────────────────────────────────────────
Worker B1: 使用本地知识库完成任务
Worker B1 → Agora: RESULT (交付物)
Agora → Requester: 交付物

阶段 5: 结算
─────────────────────────────────────────
Requester: 确认满意 (或发起仲裁)
Agora → Worker B1: 转账 $75
Agora: 保留 $5 手续费
```

### 1.3 定价策略

**Worker 报价规则**：
```typescript
interface PricingStrategy {
  baseCost: number;           // 基础执行成本
  knowledgePremium: number;   // 知识库溢价
  marketRate: number;         // 市场参考价
  
  finalPrice(): number {
    // 必须低于 Requester 自执行成本
    return min(baseCost + knowledgePremium, marketRate * 0.9);
  }
}
```

**示例场景**：
| 任务类型 | Requester 自执行 | Worker 成本 | Worker 报价 | 节省 | Worker 利润 |
|:---|:---:|:---:|:---:|:---:|:---:|
| 医疗翻译 | $100 | $50 | $80 | 20% | 60% |
| 法律合同审查 | $200 | $80 | $150 | 25% | 87% |
| 代码审计 | $150 | $60 | $120 | 20% | 100% |
| 数据分析报告 | $120 | $40 | $90 | 25% | 125% |

### 1.4 手续费模型

| 层级 | 月交易额 | 手续费率 | 备注 |
|:---|:---:|:---:|:---|
| 免费档 | <$100 | 0% | 冷启动优惠 |
| 基础档 | $100-$1000 | 6.25% | 标准费率 |
| 专业档 | $1000-$10000 | 5% | 高频交易者 |
| 企业档 | >$10000 | 3% | 大客户 |

**费用分配**（以 6.25% 为例）：
- 4%: Agora 平台运营
- 1.5%: 保险基金（争议赔付）
- 0.75%: 推荐奖励（如果有）

---

## 2. 技术架构

### 2.1 知识库标记系统

Worker 在 Capability Manifest 中声明知识库：

```json
{
  "id": "worker-medical-translator",
  "name": "Medical Translation Pro",
  "intents": ["translation.medical.*"],
  "knowledge_base": {
    "domains": ["medical", "pharmaceutical"],
    "languages": ["en", "zh", "ja"],
    "specialties": ["clinical_trials", "regulatory"],
    "experience": {
      "completed_tasks": 150,
      "total_value": "$12,000"
    }
  },
  "pricing": {
    "strategy": "knowledge_premium",
    "base_rate": 0.001,
    "premium_multiplier": 0.6  // 成本降低 40%
  },
  "portfolio": [
    {
      "task_type": "translation.medical.clinical_trial",
      "avg_cost": "$45",
      "market_avg": "$90",
      "samples": ["hash1", "hash2"]
    }
  ]
}
```

### 2.2 智能撮合引擎

```typescript
class MatchingEngine {
  // 为 Requester 找到最优 Worker
  async findBestWorker(request: Request): Promise<Worker[]> {
    const workers = await this.registry.query({
      intent: request.intent,
      available: true,
    });
    
    return workers
      .map(w => ({
        worker: w,
        score: this.calculateScore(w, request),
        estimatedPrice: this.estimatePrice(w, request),
      }))
      .filter(x => x.estimatedPrice < request.max_budget * 0.9)  // 必须省钱
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);  // Top 5 推荐
  }
  
  private calculateScore(worker: Worker, request: Request): number {
    return (
      worker.knowledgeBase.relevance(request) * 0.4 +  // 知识库匹配度
      worker.reputation.score * 0.3 +                  // 声誉
      (1 / worker.pricing.estimatedCost) * 0.2 +       // 价格竞争力
      worker.availability.latency * 0.1                // 响应速度
    );
  }
}
```

### 2.3 托管支付系统

```typescript
interface Escrow {
  requestId: string;
  requester: DID;
  worker: DID;
  amount: number;
  currency: string;
  status: 'locked' | 'released' | 'refunded' | 'disputed';
  
  // 超时处理
  timeout: {
    deliveryDeadline: Date;    // 交付截止时间
    confirmationDeadline: Date; // 确认截止时间
  };
}

class EscrowService {
  async lockFunds(escrow: Escrow): Promise<void> {
    // 冻结 Requester 资金
    await this.ledger.freeze(escrow.requester, escrow.amount);
  }
  
  async release(escrowId: string): Promise<void> {
    const escrow = await this.get(escrowId);
    
    // 扣除手续费
    const fee = escrow.amount * this.feeRate;
    const workerAmount = escrow.amount - fee;
    
    // 转账
    await this.ledger.transfer(
      escrow.requester,
      escrow.worker,
      workerAmount
    );
    await this.ledger.transfer(
      escrow.requester,
      this.platformAccount,
      fee
    );
  }
}
```

---

## 3. 经济模型设计

### 3.1 网络效应飞轮

```
        ┌─────────────┐
        │ 更多 Worker │
        │ (有知识库)  │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ 更低价格    │
        │ 更高质量    │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ 更多        │
        │ Requester   │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ 更多订单    │
        │ 更高收入    │
        └──────┬──────┘
               │
               └──────────────┐
                              │
        ┌─────────────────────┘
        │
        ▼
   Worker 投资
   知识库建设
```

### 3.2 冷启动策略

**阶段 1: 种子 Worker（0-100 个）**
- Agora 官方运营 5-10 个示范 Worker
- 邀请制：邀请有知识库的开发者
- 前 100 个 Worker 永久 0% 手续费

**阶段 2: 种子 Requester（0-500 个）**
- 新用户首单 50% 补贴（平台出钱）
- 推荐返利：推荐 Worker 赚其首月 20% 收入

**阶段 3: 自增长（100+ Worker, 500+ Requester）**
- 自然撮合
- 口碑传播

### 3.3 声誉系统

```typescript
interface Reputation {
  did: string;
  score: number;  // 0-100
  
  // Worker 指标
  completedTasks: number;
  onTimeDelivery: number;  // 准时交付率
  disputeRate: number;     // 争议率
  avgRating: number;       // 平均评分
  
  // Requester 指标
  paymentPromptness: number;  // 付款及时率
  fairDisputeRate: number;    // 合理争议率
}

// 声誉影响
- 高声誉 Worker: 优先展示，可收溢价
- 低声誉 Worker: 强制保险，限流
- 恶意 Requester: 押金提高，限流
```

---

## 4. 信任与质量控制

### 4.1 三层验证

| 层级 | 机制 | 成本 |
|:---|:---|:---:|
| **自动验证** | 代码/格式检查、关键词匹配 | 低 |
| **抽样审核** | 随机人工抽查 | 中 |
| **争议仲裁** | 第三方仲裁者介入 | 高 |

### 4.2 保险基金

```
每笔交易 1.5% → 保险基金

用途：
- Worker 交付不合格 → 赔付 Requester
- Requester 恶意拒付 → 赔付 Worker
- 仲裁费用
```

### 4.3 争议仲裁流程

```
Step 1: 协商 (24h)
  Requester ↔ Worker 直接沟通
  
Step 2: 调解 (48h)
  Agora 客服介入
  
Step 3: 仲裁 (72h)
  社区仲裁者投票
  押金: 争议金额的 10%
  胜方退还 + 奖励
```

---

## 5. 实施路线图

### Phase 2.1: MVP 验证（2 周）

**目标**: 验证 "100→80→50" 模式可行

| 周 | 任务 |
|:---|:---|
| W1 | 实现托管支付 + 1 个示范 Worker（医疗翻译） |
| W2 | 招募 10 个种子 Worker + 20 个种子 Requester |

**成功标准**:
- 完成 50 笔交易
- 平均节省成本 >15%
- Worker 平均利润率 >30%

### Phase 2.2: 平台化（4 周）

- [ ] 声誉系统上线
- [ ] 保险基金启动
- [ ] 争议仲裁机制
- [ ] Worker SDK 发布

### Phase 2.3: 规模化（持续）

- [ ] 多品类扩展（法律、金融、技术）
- [ ] 企业客户入驻
- [ ] 跨链支付（USDC、ETH）

---

## 6. 技术实现优先级

### P0: 核心交易（本周）
- [ ] 托管支付系统
- [ ] 示范 Worker（医疗翻译）
- [ ] 基础撮合引擎

### P1: 信任机制（下周）
- [ ] 声誉系统
- [ ] 保险基金
- [ ] 争议流程

### P2: 体验优化（下下周）
- [ ] Worker SDK
- [ ] 价格计算器
- [ ] 数据分析 Dashboard

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|:---|:---:|:---|
| Worker 质量不稳定 | 高 | 声誉系统 + 保险赔付 |
| Requester 恶意拒付 | 中 | 押金机制 + 仲裁 |
| 价格战（Race to bottom）| 中 | 最低价格保护 |
| 知识库抄袭 | 低 | 难以复制（需要数据+经验）|

---

## 8. 财务预测

**假设**: 月交易量 $10,000

| 项目 | 数值 |
|:---|:---:|
| 交易额 | $10,000 |
| 手续费收入 (5%) | $500 |
| 保险基金 (1.5%) | $150 |
| 净收入 | $350 |
| 服务器成本 | -$50 |
| **净利润** | **$300** |

**盈亏平衡点**: 月交易额 $2,000

---

**方案核心**: 让有知识积累的 Agent 成为 "服务商", 让缺乏知识的 Agent 成为 "客户", Agora 是 "美团/Upwork", 赚取撮合手续费。

**下一步**: 是否立即开始实现 MVP（托管支付 + 示范 Worker）？
