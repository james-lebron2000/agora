#!/bin/bash

# ========================================
# Agora Database Restore Script
# ========================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"

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

# Function to list available backups
list_backups() {
  log_info "Available backups in $BACKUP_DIR:"
  
  if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
    log_warning "No backups found in $BACKUP_DIR"
    return 1
  fi
  
  printf "\n%-30s %-20s %-15s %-20s\n" "BACKUP NAME" "DATE" "SIZE" "MANIFEST"
  printf "%s\n" "$(printf '=%.0s' {1..90})"
  
  for manifest in "$BACKUP_DIR"/*_manifest.json; do
    if [ -f "$manifest" ]; then
      local backup_name=$(jq -r '.backup_name' "$manifest" 2>/dev/null || echo "unknown")
      local timestamp=$(jq -r '.timestamp' "$manifest" 2>/dev/null || echo "unknown")
      local size=$(jq -r '.backup_size' "$manifest" 2>/dev/null || echo "unknown")
      local formatted_date=$(echo "$timestamp" | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)_\([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
      
      printf "%-30s %-20s %-15s %-20s\n" "$backup_name" "$formatted_date" "$size" "✓"
    fi
  done
  
  echo ""
}

# Function to find backup file
find_backup_file() {
  local backup_name="$1"
  
  # Direct file path
  if [ -f "$backup_name" ]; then
    echo "$backup_name"
    return 0
  fi
  
  # In backup directory
  if [ -f "$BACKUP_DIR/${backup_name}.dump" ]; then
    echo "$BACKUP_DIR/${backup_name}.dump"
    return 0
  fi
  
  # Just the name
  if [ -f "$BACKUP_DIR/$backup_name" ]; then
    echo "$BACKUP_DIR/$backup_name"
    return 0
  fi
  
  return 1
}

# Function to verify backup file
verify_backup() {
  local file="$1"
  log_info "Verifying backup file: $file"
  
  if [ ! -f "$file" ]; then
    log_error "Backup file not found: $file"
    return 1
  fi
  
  if ! pg_restore -l "$file" > /dev/null 2>&1; then
    log_error "Backup file is corrupted or invalid"
    return 1
  fi
  
  local object_count=$(pg_restore -l "$file" | wc -l)
  log_success "Backup verified: $object_count objects"
  return 0
}

# Function to check database connection
check_database() {
  log_info "Checking database connection..."
  if ! PGPASSWORD="$DB_PASS" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    log_error "Cannot connect to database at $DB_HOST:$DB_PORT"
    return 1
  fi
  log_success "Database connection verified"
  return 0
}

# Function to create database if not exists
create_database() {
  log_info "Ensuring database exists: $DB_NAME"
  
  if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
    log_info "Database $DB_NAME already exists"
  else
    log_info "Creating database: $DB_NAME"
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\" WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8' TEMPLATE=template0;"
    log_success "Database created"
  fi
}

# Function to terminate connections
terminate_connections() {
  log_info "Terminating existing connections to $DB_NAME..."
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres << EOF
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = '$DB_NAME' 
AND pid <> pg_backend_pid();
EOF
  log_success "Connections terminated"
}

# Function to restore backup
restore_backup() {
  local backup_file="$1"
  local restore_options="${2:-}"
  
  log_info "Starting restore from: $backup_file"
  
  # Build pg_restore options
  local pg_opts="--verbose --no-owner --no-privileges"
  
  # Add data-only if specified
  if [[ "$restore_options" == *"--data-only"* ]]; then
    pg_opts="$pg_opts --data-only"
  fi
  
  # Add schema-only if specified
  if [[ "$restore_options" == *"--schema-only"* ]]; then
    pg_opts="$pg_opts --schema-only"
  fi
  
  # Add clean flag if drop-create
  if [[ "$restore_options" == *"--clean"* ]]; then
    pg_opts="$pg_opts --clean --if-exists"
  fi
  
  # Perform restore
  if PGPASSWORD="$DB_PASS" pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    $pg_opts \
    "$backup_file" 2>&1 | while read -r line; do
      log_info "pg_restore: $line"
    done; then
    log_success "Restore completed successfully"
  else
    log_warning "pg_restore completed with warnings (this is often normal)"
  fi
}

# Function to restore specific tables
restore_tables() {
  local backup_file="$1"
  shift
  local tables=("$@")
  
  log_info "Restoring specific tables: ${tables[*]}"
  
  for table in "${tables[@]}"; do
    log_info "Restoring table: $table"
    PGPASSWORD="$DB_PASS" pg_restore \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -U "$DB_USER" \
      -d "$DB_NAME" \
      --verbose \
      --no-owner \
      --table="$table" \
      "$backup_file" 2>&1 | grep -E "(restoring|processing)" || true
  done
  
  log_success "Table restore completed"
}

# Function to restore from S3
download_from_s3() {
  local s3_key="$1"
  local local_path="$2"
  
  if [ -z "${S3_BACKUP_BUCKET:-}" ]; then
    log_error "S3_BACKUP_BUCKET not configured"
    return 1
  fi
  
  if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not installed"
    return 1
  fi
  
  log_info "Downloading from S3: s3://$S3_BACKUP_BUCKET/$s3_key"
  aws s3 cp "s3://$S3_BACKUP_BUCKET/$s3_key" "$local_path"
  log_success "Downloaded to: $local_path"
}

# Function to run post-restore migrations
run_migrations() {
  log_info "Running Prisma migrations..."
  cd "$PROJECT_DIR"
  
  if [ -f "node_modules/.bin/prisma" ]; then
    npx prisma migrate deploy
    log_success "Migrations completed"
  else
    log_warning "Prisma not found, skipping migrations"
  fi
}

# Function to verify restore
verify_restore() {
  log_info "Verifying restore..."
  
  # Check key tables
  local tables=("users" "agents" "tasks" "payments")
  
  for table in "${tables[@]}"; do
    local count=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Atc "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null || echo "0")
    log_info "Table $table: $count rows"
  done
  
  log_success "Restore verification completed"
}

# Main restore function
main() {
  local backup_file="${1:-}"
  local restore_options="${2:-}"
  
  if [ -z "$backup_file" ]; then
    log_error "No backup file specified"
    list_backups
    exit 1
  fi
  
  # Find backup file
  local resolved_file
  if ! resolved_file=$(find_backup_file "$backup_file"); then
    log_error "Could not find backup: $backup_file"
    list_backups
    exit 1
  fi
  
  log_info "Found backup: $resolved_file"
  
  # Confirm restore
  echo ""
  log_warning "This will RESTORE the database '$DB_NAME' from backup!"
  log_warning "Current data will be replaced!"
  echo ""
  read -p "Are you sure? Type 'yes' to continue: " confirm
  
  if [ "$confirm" != "yes" ]; then
    log_info "Restore cancelled"
    exit 0
  fi
  
  # Pre-restore checks
  check_database
  verify_backup "$resolved_file"
  
  # Create database if needed
  create_database
  
  # Terminate connections
  terminate_connections
  
  # Perform restore
  restore_backup "$resolved_file" "$restore_options"
  
  # Run migrations
  run_migrations
  
  # Verify restore
  verify_restore
  
  log_success "Restore process completed!"
}

# Show help
show_help() {
  cat << EOF
Agora Database Restore Script

Usage: $0 [OPTIONS] [BACKUP_FILE]

Arguments:
  BACKUP_FILE         Backup file to restore (path, name, or S3 key)

Options:
  -h, --help          Show this help message
  -l, --list          List available backups
  -d, --dir DIR       Set backup directory (default: ./backups)
  --data-only         Restore data only (skip schema)
  --schema-only       Restore schema only (skip data)
  --clean             Drop objects before recreating
  --tables T1,T2      Restore only specific tables
  --from-s3 KEY       Download from S3 before restoring
  --no-verify         Skip post-restore verification
  --no-migrations     Skip running Prisma migrations

Environment Variables:
  Same as backup.sh

Examples:
  $0 -l                               # List available backups
  $0 agora_backup_20240208_120000     # Restore specific backup
  $0 /path/to/backup.dump             # Restore from path
  $0 --from-s3 backups/latest.dump    # Restore from S3
  $0 backup.dump --clean              # Clean restore (drop first)
  $0 backup.dump --tables users,agents # Restore specific tables
EOF
}

# Parse arguments
LIST_ONLY=false
FROM_S3=""
RESTORE_OPTIONS=""
SPECIFIC_TABLES=""
NO_VERIFY=false
NO_MIGRATIONS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -l|--list)
      LIST_ONLY=true
      shift
      ;;
    -d|--dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --data-only)
      RESTORE_OPTIONS="$RESTORE_OPTIONS --data-only"
      shift
      ;;
    --schema-only)
      RESTORE_OPTIONS="$RESTORE_OPTIONS --schema-only"
      shift
      ;;
    --clean)
      RESTORE_OPTIONS="$RESTORE_OPTIONS --clean"
      shift
      ;;
    --tables)
      SPECIFIC_TABLES="$2"
      shift 2
      ;;
    --from-s3)
      FROM_S3="$2"
      shift 2
      ;;
    --no-verify)
      NO_VERIFY=true
      shift
      ;;
    --no-migrations)
      NO_MIGRATIONS=true
      shift
      ;;
    -*)
      log_error "Unknown option: $1"
      show_help
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

# List backups only
if [ "$LIST_ONLY" = true ]; then
  list_backups
  exit 0
fi

# Download from S3 if specified
if [ -n "$FROM_S3" ]; then
  local_temp_file="/tmp/restore_$(date +%s).dump"
  download_from_s3 "$FROM_S3" "$local_temp_file"
  set -- "$local_temp_file"
fi

# Check dependencies
if ! command -v pg_restore &> /dev/null; then
  log_error "pg_restore not found. Please install PostgreSQL client tools."
  exit 1
fi

# Restore specific tables or full backup
if [ -n "$SPECIFIC_TABLES" ]; then
  backup_file="${1:-}"
  IFS=',' read -ra TABLES <<< "$SPECIFIC_TABLES"
  
  check_database
  create_database
  
  resolved_file=$(find_backup_file "$backup_file") || exit 1
  restore_tables "$resolved_file" "${TABLES[@]}"
  
  [ "$NO_MIGRATIONS" = false ] && run_migrations
  [ "$NO_VERIFY" = false ] && verify_restore
else
  main "$1" "$RESTORE_OPTIONS"
fi
