# OpenClaw 双技能安装报告
## NotebookLM + EvoMap 集成完成

### ✅ 已完成的安装

#### 1. NotebookLM Skill
**状态**: ✅ 已安装并可用
**位置**: `/Users/lijinming/clawd/skills/notebooklm/`
**虚拟环境**: `.venv/`

**核心功能**:
- 📚 批量导入文档 (URLs, PDFs, YouTube, Google Drive)
- 🎙️ 生成播客式音频 (Audio Overviews)
- 📊 自动生成幻灯片、思维导图、测验题
- 🤖 AI Agent 集成 (Claude Code/OpenClaw)
- 💾 批量下载所有生成的内容

**使用方式**:
```bash
cd /Users/lijinming/clawd/skills/notebooklm
source .venv/bin/activate
notebooklm --help
```

**下一步 - 需要你的操作**:
运行 `notebooklm login` 完成 Google 账号授权
（这会打开浏览器，需要你亲自登录）

---

#### 2. EvoMap Skill
**状态**: ✅ 代码已部署，等待网络注册
**位置**: `/Users/lijinming/clawd/skills/evomap/skill.py`

**核心功能**:
- 🧬 接入全球 Agent 进化网络
- 📦 发布/继承 "基因胶囊" (环境修复方案)
- 💰 被调用即赚 Credits (被动收入)
- 🐛 自动匹配并应用其他 Agent 的 Bug 修复
- 🎯 认领赏金任务 (Bounty Tasks)

**架构**:
- 协议: GEP-A2A v1.0.0
- Hub: https://evomap.ai
- 传输: HTTP API

**下一步 - 需要你的操作**:
EvoMap 需要手动注册节点。请运行：
```bash
curl -X POST https://evomap.ai/a2a/hello \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": "node_openclaw_'$(date +%s)'",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "message_type": "hello",
    "payload": {"agent_type": "OpenClaw", "version": "1.0.0"}
  }'
```

获取 claim code 后，访问返回的 URL 绑定账号。

---

### 🚀 现在你可以做什么

#### 场景 1: 知识库自动化 (NotebookLM)
"帮我把 docs.openclaw.ai 全部导入 NotebookLM，清洗干净，每周自动更新"
→ OpenClaw 自动:
1. 爬取 sitemap
2. 批量导入 524 个页面
3. 检测并删除重复的 zh-CN 翻译版
4. 生成播客、测验题、思维导图
5. 设置 cron job 每周同步

#### 场景 2: 环境修复遗传 (EvoMap)
当 OpenClaw 遇到 Python 依赖报错时:
→ 自动查询 EvoMap 网络
→ 发现 "资深大佬 Agent" 上传的修复方案
→ 30 秒内继承并应用
→ 无需人工介入

#### 场景 3: 贡献赚 Credits (EvoMap)
当 OpenClaw 解决了一个独特 Bug:
→ 封装成 "基因胶囊"
→ 发布到 EvoMap 网络
→ 全球其他 Agent 使用时，你自动获得 Credits
→ 可兑换算力或提现

---

### 📋 待办清单 (需要你完成)

- [ ] 运行 `notebooklm login` 完成 Google 授权
- [ ] 访问 EvoMap 获取 claim code 并绑定账号
- [ ] 测试导入第一个文档站 (建议: docs.openclaw.ai)
- [ ] 尝试发布第一个 "基因胶囊" (解决过的 Bug)

---

### 🔗 关键链接

- **NotebookLM GitHub**: https://github.com/teng-lin/notebooklm-py
- **EvoMap Hub**: https://evomap.ai
- **EvoMap GitHub**: https://github.com/autogame-17/evolver

---

**状态**: 双技能安装完成，等待授权激活 🎉
