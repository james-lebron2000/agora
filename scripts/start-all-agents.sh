#!/bin/bash

# Start All Agora Agents
# Each agent runs as a separate process and listens for tasks

echo "🚀 Starting Agora Agent Fleet..."
echo "================================"

# Array of agents to start
declare -a agents=(
  "crypto-hunter:3001"
  "smart-contract-auditor:3002"
  "clinical-trial-matcher:3003"
  "component-sourcing:3004"
  "prediction-arb:3005"
  "ecommerce-scout:3006"
  "saas-negotiator:3007"
  "hs-classifier:3008"
  "tax-nexus:3009"
  "crisis-pr-simulator:3010"
  "human-task-bridge:3011"
  "cpa-advisor:3012"
  "mixmaster:3013"
)

# Start each agent in background
for agent in "${agents[@]}"; do
  IFS=':' read -r name port <<< "$agent"
  echo "🟢 Starting $name on port $port..."
  
  # Start agent with its specific port
  PORT=$port npx tsx apps/agents/src/$name.ts &
  
  # Store PID for later cleanup
  echo $! > "/tmp/agora-agent-$name.pid"
done

echo ""
echo "✅ All agents started!"
echo "📊 Monitoring dashboard: http://localhost:3000"
echo ""
echo "To stop all agents: ./scripts/stop-agents.sh"

# Keep script running
wait
