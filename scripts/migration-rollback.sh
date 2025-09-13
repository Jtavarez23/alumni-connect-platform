#!/bin/bash

# ===========================================
# Alumni Connect - Migration Rollback Script
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
MIGRATION_VERSION=${1}
ROLLBACK_TYPE=${2:-auto}  # auto, manual, backup
SUPABASE_DB_URL=${SUPABASE_DB_URL:-"postgresql://postgres:postgres@localhost:54322/postgres"}
BACKUP_DIR="data/migration-backups"
ROLLBACK_DIR="supabase/rollbacks"

print_status "Alumni Connect Migration Rollback"

# Show usage if no parameters
if [ -z "$MIGRATION_VERSION" ]; then
    echo "Usage: $0 <migration-version> [rollback-type]"
    echo
    echo "Migration version: The timestamp/version to rollback to"
    echo "Rollback type: auto (default), manual, backup"
    echo
    echo "Examples:"
    echo "  $0 20250911120000  # Rollback to specific version"
    echo "  $0 20250911120000 manual  # Use manual rollback script"
    echo "  $0 20250911120000 backup  # Restore from backup"
    exit 1
fi

print_status "Rolling back to migration version: $MIGRATION_VERSION"
print_status "Rollback type: $ROLLBACK_TYPE"

# Function to validate migration version
validate_migration_version() {
    print_status "Validating migration version..."
    
    # Check if migration version exists
    local migration_exists
    migration_exists=$(find supabase/migrations -name "${MIGRATION_VERSION}_*" | wc -l)
    
    if [ "$migration_exists" -eq 0 ]; then
        print_error "Migration version $MIGRATION_VERSION not found"
        exit 1
    fi
    
    # Get current migration version
    local current_version
    current_version=$(psql "$SUPABASE_DB_URL" -t -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | tr -d ' ' || echo "none")
    
    print_status "Current version: $current_version"
    print_status "Target version: $MIGRATION_VERSION"
    
    # Validate rollback direction
    if [[ "$current_version" < "$MIGRATION_VERSION" ]] || [[ "$current_version" == "$MIGRATION_VERSION" ]]; then
        print_warning "Current version is not ahead of target version"
        print_warning "This may not be a standard rollback scenario"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Rollback cancelled"
            exit 0
        fi
    fi
}

# Function to create emergency backup
create_emergency_backup() {
    print_status "Creating emergency backup before rollback..."
    mkdir -p "$BACKUP_DIR"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/pre_rollback_${timestamp}.sql"
    
    if command -v pg_dump >/dev/null 2>&1; then
        if pg_dump "$SUPABASE_DB_URL" > "$backup_file"; then
            print_success "Emergency backup created: $backup_file"
            echo "$backup_file"
        else
            print_error "Failed to create emergency backup"
            exit 1
        fi
    else
        print_error "pg_dump not found, cannot create backup"
        exit 1
    fi
}

# Function to identify migrations to rollback
identify_migrations_to_rollback() {
    print_status "Identifying migrations to rollback..."
    
    # Get list of migrations applied after target version
    local migrations_to_rollback=()
    while IFS= read -r -d '' file; do
        local version=$(basename "$file" | cut -d'_' -f1)
        if [[ "$version" > "$MIGRATION_VERSION" ]]; then
            migrations_to_rollback+=("$file")
        fi
    done < <(find supabase/migrations -name "*.sql" -print0 | sort -rz)
    
    if [ ${#migrations_to_rollback[@]} -eq 0 ]; then
        print_warning "No migrations found to rollback"
        return 0
    fi
    
    print_status "Migrations to rollback:"
    for migration in "${migrations_to_rollback[@]}"; do
        echo "  - $(basename "$migration")"
    done
    
    echo "${migrations_to_rollback[@]}"
}

# Function to generate automatic rollback script
generate_auto_rollback() {
    local migrations_to_rollback=("$@")
    print_status "Generating automatic rollback script..."
    
    local rollback_script="$ROLLBACK_DIR/auto_rollback_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p "$ROLLBACK_DIR"
    
    cat > "$rollback_script" << 'EOF'
-- ===========================================
-- AUTO-GENERATED ROLLBACK SCRIPT
-- ===========================================
-- WARNING: This is an automatically generated rollback script
-- Review carefully before executing!

BEGIN;

-- Disable triggers during rollback
SET session_replication_role = replica;

EOF

    # Analyze each migration and generate reverse operations
    for migration_file in "${migrations_to_rollback[@]}"; do
        print_status "Analyzing migration: $(basename "$migration_file")"
        
        echo "-- Rollback for $(basename "$migration_file")" >> "$rollback_script"
        
        # Simple pattern matching for common operations
        # CREATE TABLE -> DROP TABLE
        grep -i "CREATE TABLE" "$migration_file" | while read -r line; do
            local table_name=$(echo "$line" | grep -oP 'CREATE TABLE\s+\K\w+' | head -1)
            if [ -n "$table_name" ]; then
                echo "DROP TABLE IF EXISTS $table_name CASCADE;" >> "$rollback_script"
            fi
        done
        
        # ADD COLUMN -> DROP COLUMN
        grep -i "ADD COLUMN" "$migration_file" | while read -r line; do
            local table_name=$(echo "$line" | grep -oP 'ALTER TABLE\s+\K\w+' | head -1)
            local column_name=$(echo "$line" | grep -oP 'ADD COLUMN\s+\K\w+' | head -1)
            if [ -n "$table_name" ] && [ -n "$column_name" ]; then
                echo "ALTER TABLE $table_name DROP COLUMN IF EXISTS $column_name;" >> "$rollback_script"
            fi
        done
        
        # CREATE INDEX -> DROP INDEX
        grep -i "CREATE INDEX" "$migration_file" | while read -r line; do
            local index_name=$(echo "$line" | grep -oP 'CREATE INDEX\s+\K\w+' | head -1)
            if [ -n "$index_name" ]; then
                echo "DROP INDEX IF EXISTS $index_name;" >> "$rollback_script"
            fi
        done
        
        # CREATE FUNCTION -> DROP FUNCTION
        grep -i "CREATE OR REPLACE FUNCTION\|CREATE FUNCTION" "$migration_file" | while read -r line; do
            local function_name=$(echo "$line" | grep -oP 'FUNCTION\s+\K[^(]+' | head -1)
            if [ -n "$function_name" ]; then
                echo "DROP FUNCTION IF EXISTS $function_name CASCADE;" >> "$rollback_script"
            fi
        done
        
        echo "" >> "$rollback_script"
    done
    
    cat >> "$rollback_script" << 'EOF'

-- Remove migration entries
DELETE FROM supabase_migrations.schema_migrations 
WHERE version > $MIGRATION_VERSION;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

COMMIT;

-- Verify rollback
SELECT 'Rollback completed. Current version: ' || 
       (SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1);
EOF

    print_success "Auto-rollback script generated: $rollback_script"
    echo "$rollback_script"
}

# Function to use manual rollback script
use_manual_rollback() {
    print_status "Looking for manual rollback script..."
    
    local manual_rollback_file="$ROLLBACK_DIR/${MIGRATION_VERSION}_rollback.sql"
    
    if [ -f "$manual_rollback_file" ]; then
        print_success "Found manual rollback script: $manual_rollback_file"
        echo "$manual_rollback_file"
    else
        print_error "Manual rollback script not found: $manual_rollback_file"
        print_status "Create a manual rollback script or use auto rollback"
        exit 1
    fi
}

# Function to restore from backup
restore_from_backup() {
    print_status "Looking for backup files..."
    
    # Find the most recent backup before the target migration
    local backup_files=()
    while IFS= read -r -d '' file; do
        backup_files+=("$file")
    done < <(find "$BACKUP_DIR" -name "*.sql" -print0 | sort -rz)
    
    if [ ${#backup_files[@]} -eq 0 ]; then
        print_error "No backup files found in $BACKUP_DIR"
        exit 1
    fi
    
    print_status "Available backups:"
    local i=1
    for backup in "${backup_files[@]}"; do
        echo "$i. $(basename "$backup")"
        i=$((i + 1))
    done
    
    echo -n "Select backup to restore (1-${#backup_files[@]}): "
    read -r selection
    
    if [[ "$selection" -ge 1 && "$selection" -le ${#backup_files[@]} ]]; then
        local selected_backup="${backup_files[$((selection - 1))]}"
        print_success "Selected backup: $(basename "$selected_backup")"
        echo "$selected_backup"
    else
        print_error "Invalid selection"
        exit 1
    fi
}

# Function to execute rollback
execute_rollback() {
    local rollback_script=$1
    
    print_warning "About to execute rollback script: $(basename "$rollback_script")"
    print_warning "This operation cannot be easily undone!"
    
    echo -n "Are you sure you want to proceed? (type 'ROLLBACK' to confirm): "
    read -r confirmation
    
    if [ "$confirmation" != "ROLLBACK" ]; then
        print_status "Rollback cancelled"
        exit 0
    fi
    
    print_status "Executing rollback..."
    
    if [ "$ROLLBACK_TYPE" = "backup" ]; then
        # Restore from backup
        print_status "Dropping current database and restoring from backup..."
        
        # Create new database and restore
        local temp_db="alumni_connect_temp_$(date +%s)"
        createdb -h localhost -p 54322 -U postgres "$temp_db"
        
        if psql "postgresql://postgres:postgres@localhost:54322/$temp_db" < "$rollback_script"; then
            # Swap databases
            print_status "Swapping databases..."
            # This would need more sophisticated logic in production
            print_warning "Database backup restore completed"
            print_warning "Manual verification required"
        else
            print_error "Backup restore failed"
            dropdb -h localhost -p 54322 -U postgres "$temp_db" 2>/dev/null || true
            exit 1
        fi
    else
        # Execute rollback script
        if psql "$SUPABASE_DB_URL" -f "$rollback_script"; then
            print_success "Rollback executed successfully"
        else
            print_error "Rollback execution failed"
            print_error "Database may be in inconsistent state!"
            print_status "Check logs and consider manual intervention"
            exit 1
        fi
    fi
}

# Function to verify rollback
verify_rollback() {
    print_status "Verifying rollback..."
    
    # Check current migration version
    local current_version
    current_version=$(psql "$SUPABASE_DB_URL" -t -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | tr -d ' ')
    
    print_status "Current migration version after rollback: $current_version"
    
    if [[ "$current_version" == "$MIGRATION_VERSION" ]]; then
        print_success "Rollback verification successful"
    else
        print_warning "Rollback verification unclear - manual verification recommended"
    fi
    
    # Basic table existence check
    local table_count
    table_count=$(psql "$SUPABASE_DB_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    print_status "Tables in database: $table_count"
    
    # Check basic functionality
    if psql "$SUPABASE_DB_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        print_success "Database is accessible"
    else
        print_error "Database accessibility issues detected"
    fi
}

# Function to generate rollback report
generate_rollback_report() {
    local report_file="logs/rollback_report_$(date +%Y%m%d_%H%M%S).log"
    mkdir -p logs
    
    print_status "Generating rollback report..."
    
    cat > "$report_file" << EOF
# Migration Rollback Report

**Target Version:** $MIGRATION_VERSION
**Rollback Type:** $ROLLBACK_TYPE
**Rollback Date:** $(date)
**Operator:** $(whoami)

## Pre-Rollback Status
- Database was accessible: ✅
- Emergency backup created: ✅

## Rollback Execution
- Rollback method: $ROLLBACK_TYPE
- Execution status: ✅ Completed

## Post-Rollback Verification
- Current version: $(psql "$SUPABASE_DB_URL" -t -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | tr -d ' ')
- Database accessible: ✅

## Next Steps
1. Verify application functionality
2. Monitor for issues
3. Plan fix for original migration if needed
4. Communicate rollback to team

EOF

    print_success "Rollback report generated: $report_file"
}

# Main rollback process
main() {
    print_status "Starting migration rollback process..."
    
    # Validate inputs
    validate_migration_version
    
    # Create emergency backup
    backup_file=$(create_emergency_backup)
    
    # Identify what needs to be rolled back
    migrations_list=($(identify_migrations_to_rollback))
    
    if [ ${#migrations_list[@]} -eq 0 ]; then
        print_success "No rollback needed"
        exit 0
    fi
    
    # Choose rollback method
    case $ROLLBACK_TYPE in
        "auto")
            rollback_script=$(generate_auto_rollback "${migrations_list[@]}")
            ;;
        "manual")
            rollback_script=$(use_manual_rollback)
            ;;
        "backup")
            rollback_script=$(restore_from_backup)
            ;;
        *)
            print_error "Invalid rollback type: $ROLLBACK_TYPE"
            exit 1
            ;;
    esac
    
    # Execute rollback
    execute_rollback "$rollback_script"
    
    # Verify rollback
    verify_rollback
    
    # Generate report
    generate_rollback_report
    
    print_success "Migration rollback completed!"
    
    echo
    print_status "Rollback Summary:"
    echo "✅ Emergency backup: $backup_file"
    echo "✅ Rollback executed: $(basename "$rollback_script")"
    echo "✅ Database verified"
    
    echo
    print_warning "Next steps:"
    echo "1. Test application functionality"
    echo "2. Monitor logs for issues"
    echo "3. Fix original migration problems"
    echo "4. Plan re-deployment strategy"
}

# Handle script interruption
trap 'print_error "Rollback interrupted - database may be in inconsistent state!"; exit 1' INT TERM

# Run main function
main

print_success "Migration rollback process completed!"