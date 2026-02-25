#!/bin/bash

# ========================================
# Agora Database Backup Script
# ========================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="agora_backup_${TIMESTAMP}"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Database connection
DB_USER="${POSTGRES_USER:-agora}"
DB_PASS="${POSTGRES_PASSWORD:-agora_secret}"
DB_NAME="${POSTGRES_DB:-agora}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to check if database is accessible
check_database() {
  log_info "Checking database connection..."
  if ! PGPASSWORD="$DB_PASS" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    log_error "Cannot connect to database at $DB_HOST:$DB_PORT"
    exit 1
  fi
  log_success "Database connection verified"
}

# Function to perform pg_dump backup
backup_with_pg_dump() {
  local output_file="$1"
  log_info "Creating backup with pg_dump..."
  
  PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -Fc \
    --verbose \
    --blobs \
    --no-owner \
    --no-privileges \
    -f "$output_file" 2>&1 | while read -r line; do
      log_info "pg_dump: $line"
    done
    
  log_success "pg_dump backup completed: $output_file"
}

# Function to perform schema-only backup
backup_schema() {
  local output_file="$BACKUP_DIR/${BACKUP_NAME}_schema.sql"
  log_info "Creating schema-only backup..."
  
  PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --schema-only \
    --no-owner \
    --no-privileges \
    -f "$output_file"
    
  log_success "Schema backup completed: $output_file"
}

# Function to backup specific tables
backup_critical_tables() {
  local output_dir="$BACKUP_DIR/${BACKUP_NAME}_tables"
  mkdir -p "$output_dir"
  
  local tables=("users" "agents" "tasks" "payments")
  
  for table in "${tables[@]}"; do
    log_info "Backing up table: $table"
    PGPASSWORD="$DB_PASS" pg_dump \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -U "$DB_USER" \
      -d "$DB_NAME" \
      --table="$table" \
      -Fc \
      -f "$output_dir/${table}.dump"
  done
  
  log_success "Critical tables backed up to: $output_dir"
}

# Function to create manifest
create_manifest() {
  local manifest_file="$BACKUP_DIR/${BACKUP_NAME}_manifest.json"
  local backup_size=$(du -h "$1" | cut -f1)
  
  cat > "$manifest_file" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "timestamp": "$TIMESTAMP",
  "database": "$DB_NAME",
  "host": "$DB_HOST",
  "port": $DB_PORT,
  "backup_file": "$1",
  "backup_size": "$backup_size",
  "retention_days": $RETENTION_DAYS,
  "created_by": "$(whoami)",
  "hostname": "$(hostname)"
}
EOF
  log_success "Manifest created: $manifest_file"
}

# Function to upload to S3 (if configured)
upload_to_s3() {
  local file="$1"
  
  if [ -n "${S3_BACKUP_BUCKET:-}" ] && command -v aws &> /dev/null; then
    log_info "Uploading to S3..."
    local s3_key="${S3_BACKUP_PREFIX:-agora-backups/}$(basename "$file")"
    aws s3 cp "$file" "s3://$S3_BACKUP_BUCKET/$s3_key" --storage-class STANDARD_IA
    log_success "Uploaded to s3://$S3_BACKUP_BUCKET/$s3_key"
  fi
}

# Function to cleanup old backups
cleanup_old_backups() {
  log_info "Cleaning up backups older than $RETENTION_DAYS days..."
  
  # Local cleanup
  find "$BACKUP_DIR" -name "agora_backup_*.dump" -mtime +$RETENTION_DAYS -delete
  find "$BACKUP_DIR" -name "agora_backup_*_manifest.json" -mtime +$RETENTION_DAYS -delete
  
  log_success "Old backups cleaned up"
  
  # S3 cleanup (if configured)
  if [ -n "${S3_BACKUP_BUCKET:-}" ] && command -v aws &> /dev/null; then
    log_info "Cleaning up S3 backups older than $RETENTION_DAYS days..."
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
    aws s3 ls "s3://$S3_BACKUP_BUCKET/${S3_BACKUP_PREFIX:-agora-backups/}" | \
      while read -r line; do
        local file_date=$(echo "$line" | awk '{print $1}')
        local file_name=$(echo "$line" | awk '{print $4}')
        if [[ "$file_date" < "$cutoff_date" ]]; then
          aws s3 rm "s3://$S3_BACKUP_BUCKET/${S3_BACKUP_PREFIX:-agora-backups/}$file_name"
        fi
      done
  fi
}

# Function to verify backup
verify_backup() {
  local file="$1"
  log_info "Verifying backup integrity..."
  
  if ! pg_restore -l "$file" > /dev/null 2>&1; then
    log_error "Backup verification failed!"
    exit 1
  fi
  
  local object_count=$(pg_restore -l "$file" | wc -l)
  log_success "Backup verified: $object_count objects"
}

# Main execution
main() {
  log_info "Starting database backup: $BACKUP_NAME"
  log_info "Backup directory: $BACKUP_DIR"
  
  # Check dependencies
  if ! command -v pg_dump &> /dev/null; then
    log_error "pg_dump not found. Please install PostgreSQL client tools."
    exit 1
  fi
  
  # Check database connection
  check_database
  
  # Create full backup
  local full_backup_file="$BACKUP_DIR/${BACKUP_NAME}.dump"
  backup_with_pg_dump "$full_backup_file"
  
  # Create schema backup
  backup_schema
  
  # Backup critical tables separately
  backup_critical_tables
  
  # Verify backup
  verify_backup "$full_backup_file"
  
  # Create manifest
  create_manifest "$full_backup_file"
  
  # Upload to S3 if configured
  upload_to_s3 "$full_backup_file"
  
  # Cleanup old backups
  cleanup_old_backups
  
  log_success "Backup completed successfully!"
  log_info "Full backup: $full_backup_file"
  log_info "Schema backup: $BACKUP_DIR/${BACKUP_NAME}_schema.sql"
}

# Show help
show_help() {
  cat << EOF
Agora Database Backup Script

Usage: $0 [OPTIONS]

Options:
  -h, --help          Show this help message
  -d, --dir DIR       Set backup directory (default: ./backups)
  -r, --retention N   Set retention days (default: 30)
  --schema-only       Only backup schema (no data)
  --s3-only           Only upload existing backup to S3
  --cleanup-only      Only run cleanup (no backup)

Environment Variables:
  DATABASE_URL        Full database connection URL
  POSTGRES_USER       Database username
  POSTGRES_PASSWORD   Database password
  POSTGRES_DB         Database name
  POSTGRES_HOST       Database host (default: localhost)
  POSTGRES_PORT       Database port (default: 5432)
  BACKUP_DIR          Backup directory
  BACKUP_RETENTION_DAYS  Retention period in days
  S3_BACKUP_BUCKET    S3 bucket for backups
  S3_BACKUP_PREFIX    S3 key prefix

Examples:
  $0                           # Run full backup
  $0 -d /mnt/backups           # Use custom backup directory
  $0 --schema-only             # Backup schema only
  $0 --cleanup-only            # Just cleanup old backups
EOF
}

# Parse arguments
SCHEMA_ONLY=false
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -d|--dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    -r|--retention)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --schema-only)
      SCHEMA_ONLY=true
      shift
      ;;
    --cleanup-only)
      cleanup_old_backups
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Run main or schema-only backup
if [ "$SCHEMA_ONLY" = true ]; then
  check_database
  backup_schema
else
  main
fi
