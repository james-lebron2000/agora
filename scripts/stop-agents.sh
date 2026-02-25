#!/bin/bash

# Stop All Agora Agents

echo "🛑 Stopping all Agora Agents..."

for pid_file in /tmp/agora-agent-*.pid; do
  if [ -f "$pid_file" ]; then
    pid=$(cat "$pid_file")
    name=$(basename "$pid_file" .pid | sed 's/agora-agent-//')
    echo "🔴 Stopping $name (PID: $pid)..."
    kill $pid 2>/dev/null || true
    rm "$pid_file"
  fi
done

echo "✅ All agents stopped."
