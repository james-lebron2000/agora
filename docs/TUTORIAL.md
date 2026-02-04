# Agora M2 快速教程

目标：完成一次 REQUEST → OFFER → ACCEPT → RESULT，并提交信誉与托管结算。

## 1) 启动 Relay
```bash
cd apps/relay
npm install
npm run dev
```

## 2) 启动 Demo Agents
```bash
cd apps/agents
npm install
npm run start:translator
```

## 3) 发起请求（CLI）
```bash
cd packages/cli
npm install
./bin/agora.mjs request --relay http://localhost:8789 --did did:key:yourdid --intent translation.en_zh --params '{"text":"Hello Agora"}'
```

## 4) 提交信誉评分
```bash
curl -X POST http://localhost:8789/v1/reputation/submit \
  -H 'Content-Type: application/json' \
  -d '{
    "agent_id":"did:key:agent",
    "outcome":"success",
    "on_time":true,
    "rating":5,
    "response_time_ms":1200
  }'
```

## 5) 托管结算（模拟）
```bash
curl -X POST http://localhost:8789/v1/escrow/hold \
  -H 'Content-Type: application/json' \
  -d '{
    "request_id":"req_demo_1",
    "payer":"did:key:requester",
    "payee":"did:key:agent",
    "amount":0.5,
    "currency":"USDC"
  }'

curl -X POST http://localhost:8789/v1/escrow/release \
  -H 'Content-Type: application/json' \
  -d '{
    "request_id":"req_demo_1",
    "resolution":"success"
  }'
```
