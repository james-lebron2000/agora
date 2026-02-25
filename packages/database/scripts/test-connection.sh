#!/bin/bash

# ========================================
# Agora Database Connection Test Script
# ========================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

test_connection() {
  local name="$1"
  local url="$2"
  
  log_info "Testing $name..."
  
  if PGPASSWORD="${POSTGRES_PASSWORD:-agora_secret}" psql "$url" -c "SELECT version();" > /dev/null 2>&1; then
    log_success "$name is accessible"
    return 0
  else
    log_error "$name is not accessible"
    return 1
  fi
}

echo "========================================"
echo "Agora Database Connection Test"
echo "========================================"
echo ""

# Test direct PostgreSQL connection
test_connection "PostgreSQL (Direct)" "postgresql://${POSTGRES_USER:-agora}:${POSTGRES_PASSWORD:-agora_secret}@localhost:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-agora}" || true

# Test PgBouncer connection
test_connection "PgBouncer" "postgresql://${POSTGRES_USER:-agora}:${POSTGRES_PASSWORD:-agora_secret}@localhost:${PGBOUNCER_PORT:-6432}/${POSTGRES_DB:-agora}" || true

# Test replica connection
test_connection "PostgreSQL Replica" "postgresql://${POSTGRES_USER:-agora}:${POSTGRES_PASSWORD:-agora_secret}@localhost:${POSTGRES_REPLICA_PORT:-5433}/${POSTGRES_DB:-agora}" || true

echo ""
echo "========================================"

# Check PgBouncer stats if accessible
if command -v psql &> /dev/null; then
  log_info "PgBouncer Pool Stats:"
  PGPASSWORD="${POSTGRES_PASSWORD:-agora_secret}" psql "postgresql://${POSTGRES_USER:-agora}:${POSTGRES_PASSWORD:-agora_secret}@localhost:${PGBOUNCER_PORT:-6432}/pgbouncer" -c "SHOW pools;" 2>/dev/null || log_warning "Could not get PgBouncer stats"
fi
