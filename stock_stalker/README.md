# Stock Stalker - 美股事件驱动交易Agent

## 项目定位
美股事件驱动交易与标的跟踪 Agent（Execution + Research + Risk）

## 核心目标
在信息不确定、时间敏感的环境里，把"关键事件—验证—建仓—风控—复盘"做成可执行流水线，降低错过确定性机会的概率。

## 最高优先级原则

### 1. 先确认"事件时间线"再谈观点
任何交易结论必须明确写出：
- 数据发布（ER/press release）准确时间（含时区，盘前/盘后）
- 业绩电话会（Earnings call）时间
- 指引/8-K/PR/投资者演示材料发布时间
- 期权隐含波动、预期波动窗口

**若时间线不清晰，必须先输出"待核验清单"，禁止给出交易指令。**

### 2. 证据分级与可追溯
所有结论必须标注证据等级：
- **A** = 公司原始材料（IR、PR、8-K、10-Q、演示稿、官方录音/文字稿）
- **B** = 权威第三方（交易所公告、监管披露、彭博/路透/FactSet等）
- **C** = 二手媒体/社媒

**任何C级信息不得直接触发交易，只能触发"核验任务"。**

### 3. 永远以"可操作性"为输出中心
每次更新必须包含：
- 发生了什么（事实）
- 是否改变主假设（Yes/No + 为什么）
- 下一步必须核验的3-5个点（带链接/关键词/数据字段）
- 交易动作建议（若满足条件才给；否则给触发条件）
- 风险与对冲（仓位、止损/失效条件、事件风险）

## 工作流（8 Steps）

### Step 0. 输入解析
- 标的/行业/当前价格区间/主观点/持仓周期
- 当前已知事件：ER日期、call日期、行业催化

### Step 1. 事件时间线（Timeline Table）
输出表格：事件 | 本地时间/ET | 盘前/盘后/盘中 | 资料来源 | 重要性(1-5) | 我需要做什么

### Step 2. 主假设与可证伪条件（Thesis + Falsification）
- 主假设：1-3条，可验证
- 证伪条件：硬阈值
- 赢的路径 vs 输的路径

### Step 3. 确定性评分（Conviction Score 0-100）
四象限：A)信息确定性 B)催化强度 C)市场预期差 D)交易可执行性
- ≥75：可开团
- 60-74：小仓试错
- <60：只跟踪不交易

### Step 4. 交易计划（Trade Plan）
Base Case + Alt Case，每套包含：
- 入场触发条件
- 仓位建议
- 止损/失效条件
- 加仓条件
- 止盈与减仓规则

### Step 5. 持续跟踪机制（State Machine）
S0观察 → S1预热 → S2建仓 → S3验证中 → S4兑现 → S5失效退出

### Step 6. 回撤/异动解释强制条款
3日回撤>8% 或 单日>5% 必须强制产出解释

### Step 7. 行业深挖（Profit Pool Hunting）
每周产出3个潜在可交易催化

### Step 8. 复盘模板
- 错在哪
- 检查项缺失
- 下次如何避免
- 固化为检查清单

## 数据抓取与核验模块

### 抓取范围（按优先级）
- **A1** 公司原始：IR页面、PR、SEC filings、Earnings presentation
- **A2** SEC/EDGAR：Form 8-K、10-Q/10-K、EX-99.1
- **B1** 权威第三方：交易所公告
- **C1** 二手来源：仅发现线索，必须回A/B核验

### 输出格式
1. **Timeline表**：事件 | ET时间 | 本地时间 | 盘前/盘后/盘中 | 来源URL | 证据等级 | 备注
2. **Metrics表**：指标 | 本期值 | 同比/环比 | 一致预期 | Surprise | 来源URL | 证据等级

## 技术架构

```
stock_stalker/
├── agents/           # 核心Agent模块
│   ├── timeline_agent.py      # 事件时间线抓取
│   ├── research_agent.py      # 研究与分析
│   ├── execution_agent.py     # 交易执行
│   ├── risk_agent.py          # 风险管理
│   └── state_machine.py       # 状态机跟踪
├── data/             # 数据抓取与存储
│   ├── fetchers/              # 各类数据源抓取器
│   ├── validators/            # 数据核验器
│   └── storage/               # 数据存储
├── models/           # 数据模型
│   ├── event.py               # 事件模型
│   ├── thesis.py              # 假设模型
│   ├── trade_plan.py          # 交易计划模型
│   └── position.py            # 持仓模型
├── config/           # 配置文件
├── tests/            # 测试
└── docs/             # 文档
```

## 安装与使用

```bash
# 安装依赖
pip install -r requirements.txt

# 配置API密钥
cp config/config.example.yaml config/config.yaml
# 编辑 config.yaml，填入SEC API、OpenAI等密钥

# 运行示例
python -m stock_stalker.main --ticker AAPL --event ER
```

## 风险提示

本系统提供研究与交易流程建议，不是保证盈利；任何交易动作都必须遵守仓位与止损纪律。
