#!/bin/bash

# ===========================================
# Alumni Connect - Migration Validation Script
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
MIGRATION_FILE=${1}
SUPABASE_DB_URL=${SUPABASE_DB_URL:-"postgresql://postgres:postgres@localhost:54322/postgres"}
BACKUP_DIR="data/migration-backups"
TEST_DB_NAME="alumni_connect_migration_test"

if [ -z "$MIGRATION_FILE" ]; then
    print_error "Usage: $0 <migration-file>"
    echo "Example: $0 supabase/migrations/20250911_new_feature.sql"
    exit 1
fi

# Validate migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    print_error "Migration file not found: $MIGRATION_FILE"
    exit 1
fi

print_status "Validating migration: $(basename "$MIGRATION_FILE")"

# Function to create backup
create_backup() {
    print_status "Creating backup before validation..."
    mkdir -p "$BACKUP_DIR"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/pre_validation_${timestamp}.sql"
    
    if command -v pg_dump >/dev/null 2>&1; then
        pg_dump "$SUPABASE_DB_URL" > "$backup_file"
        print_success "Backup created: $backup_file"
        echo "$backup_file"
    else
        print_warning "pg_dump not found, skipping backup"
        echo ""
    fi
}

# Function to validate SQL syntax
validate_sql_syntax() {
    print_status "Validating SQL syntax..."
    
    # Check for basic syntax errors
    if grep -q ";" "$MIGRATION_FILE"; then
        print_success "SQL statements found"
    else
        print_warning "No SQL statements found in migration file"
    fi
    
    # Check for common issues
    local issues_found=0
    
    # Check for DROP TABLE without IF EXISTS
    if grep -i "DROP TABLE" "$MIGRATION_FILE" | grep -v -i "IF EXISTS" | grep -q .; then
        print_warning "Found DROP TABLE without IF EXISTS - this could cause issues"
        issues_found=$((issues_found + 1))
    fi
    
    # Check for ALTER COLUMN without proper type handling
    if grep -i "ALTER COLUMN" "$MIGRATION_FILE" | grep -q .; then
        print_warning "Found ALTER COLUMN - ensure type compatibility"
        issues_found=$((issues_found + 1))
    fi
    
    # Check for missing transaction blocks for complex changes
    if ! grep -q "BEGIN;" "$MIGRATION_FILE" && (grep -q "CREATE\|ALTER\|DROP" "$MIGRATION_FILE"); then
        print_warning "Consider wrapping complex changes in transaction blocks"
        issues_found=$((issues_found + 1))
    fi
    
    # Check for RLS policy changes
    if grep -i "ROW LEVEL SECURITY\|POLICY" "$MIGRATION_FILE" | grep -q .; then
        print_warning "Found RLS changes - ensure policies are properly tested"
        issues_found=$((issues_found + 1))
    fi
    
    if [ $issues_found -eq 0 ]; then
        print_success "No obvious syntax issues found"
    else
        print_warning "Found $issues_found potential issues - please review"
    fi
}

# Function to test migration on copy of database
test_migration_on_copy() {
    print_status "Testing migration on database copy..."
    
    # Create test database
    print_status "Creating test database..."
    if ! createdb -h localhost -p 54322 -U postgres "$TEST_DB_NAME" 2>/dev/null; then
        print_warning "Test database might already exist, dropping and recreating..."
        dropdb -h localhost -p 54322 -U postgres "$TEST_DB_NAME" 2>/dev/null || true
        createdb -h localhost -p 54322 -U postgres "$TEST_DB_NAME"
    fi
    
    local test_db_url="postgresql://postgres:postgres@localhost:54322/$TEST_DB_NAME"
    
    # Copy current database structure
    print_status "Copying current database structure..."
    pg_dump "$SUPABASE_DB_URL" | psql "$test_db_url" >/dev/null 2>&1
    
    # Apply migration to test database
    print_status "Applying migration to test database..."
    if psql "$test_db_url" -f "$MIGRATION_FILE" >/dev/null 2>&1; then
        print_success "Migration applied successfully to test database"
        
        # Run basic validation queries
        print_status "Running validation queries..."
        
        # Check if all expected tables exist
        local table_count
        table_count=$(psql "$test_db_url" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
        print_status "Tables in database: $table_count"
        
        # Check for any constraint violations
        local constraint_violations
        constraint_violations=$(psql "$test_db_url" -t -c "SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type = 'CHECK' AND is_deferrable = 'NO';" | tr -d ' ')
        print_status "Active constraints: $constraint_violations"
        
        print_success "Migration validation completed successfully"
        
    else
        print_error "Migration failed to apply to test database"
        print_status "Checking migration logs..."
        psql "$test_db_url" -f "$MIGRATION_FILE" 2>&1 | tail -10
        
        # Cleanup and exit
        dropdb -h localhost -p 54322 -U postgres "$TEST_DB_NAME" 2>/dev/null || true
        exit 1
    fi
    
    # Cleanup test database
    print_status "Cleaning up test database..."
    dropdb -h localhost -p 54322 -U postgres "$TEST_DB_NAME" 2>/dev/null || true
}

# Function to check for breaking changes
check_breaking_changes() {
    print_status "Checking for potential breaking changes..."
    
    local breaking_changes=0
    
    # Check for column drops
    if grep -i "DROP COLUMN" "$MIGRATION_FILE" | grep -q .; then
        print_warning "Found DROP COLUMN - this may break existing applications"
        breaking_changes=$((breaking_changes + 1))
    fi
    
    # Check for table renames
    if grep -i "RENAME TO" "$MIGRATION_FILE" | grep -q .; then
        print_warning "Found table/column renames - update application code accordingly"
        breaking_changes=$((breaking_changes + 1))
    fi
    
    # Check for constraint additions
    if grep -i "ADD CONSTRAINT" "$MIGRATION_FILE" | grep -q .; then
        print_warning "Found new constraints - ensure existing data complies"
        breaking_changes=$((breaking_changes + 1))
    fi
    
    # Check for NOT NULL additions
    if grep -i "NOT NULL" "$MIGRATION_FILE" | grep -q .; then
        print_warning "Found NOT NULL additions - ensure no existing null values"
        breaking_changes=$((breaking_changes + 1))
    fi
    
    if [ $breaking_changes -eq 0 ]; then
        print_success "No obvious breaking changes detected"
    else
        print_warning "Found $breaking_changes potential breaking changes"
        print_warning "Ensure you have a rollback plan and communicate changes to the team"
    fi
}

# Function to validate RLS policies
validate_rls_policies() {
    if grep -i "POLICY\|ROW LEVEL SECURITY" "$MIGRATION_FILE" | grep -q .; then
        print_status "Validating RLS policy changes..."
        
        # Check for policy syntax
        if grep -i "CREATE POLICY" "$MIGRATION_FILE" | grep -q .; then
            print_status "Found policy creation statements"
            
            # Ensure policies have proper conditions
            if grep -A 3 "CREATE POLICY" "$MIGRATION_FILE" | grep -q "USING\|WITH CHECK"; then
                print_success "Policies appear to have proper conditions"
            else
                print_warning "Some policies might be missing USING or WITH CHECK clauses"
            fi
        fi
        
        # Check for policy drops
        if grep -i "DROP POLICY" "$MIGRATION_FILE" | grep -q .; then
            print_warning "Found policy drops - ensure security is maintained"
        fi
        
        print_success "RLS policy validation completed"
    fi
}

# Function to generate migration report
generate_report() {
    local report_file="logs/migration_validation_$(date +%Y%m%d_%H%M%S).log"
    mkdir -p logs
    
    print_status "Generating validation report..."
    
    cat > "$report_file" << EOF
# Migration Validation Report

**Migration File:** $(basename "$MIGRATION_FILE")
**Validation Date:** $(date)
**Validator:** $(whoami)

## Summary
- SQL Syntax: Validated
- Test Database: Migration applied successfully
- Breaking Changes: Checked
- RLS Policies: Validated

## Migration Contents Preview
$(head -20 "$MIGRATION_FILE")

## Validation Results
- File size: $(wc -c < "$MIGRATION_FILE") bytes
- Line count: $(wc -l < "$MIGRATION_FILE") lines
- SQL statements: $(grep -c ";" "$MIGRATION_FILE")

## Recommendations
1. Review the identified warnings above
2. Test migration in staging environment
3. Ensure rollback plan is ready
4. Coordinate with team before production deployment

EOF

    print_success "Report generated: $report_file"
}

# Main validation process
main() {
    print_status "Starting migration validation process..."
    
    # Create backup
    backup_file=$(create_backup)
    
    # Validate SQL syntax
    validate_sql_syntax
    
    # Test on database copy
    test_migration_on_copy
    
    # Check for breaking changes
    check_breaking_changes
    
    # Validate RLS policies
    validate_rls_policies
    
    # Generate report
    generate_report
    
    print_success "Migration validation completed!"
    
    echo
    print_status "Next steps:"
    echo "1. Review any warnings above"
    echo "2. Test migration in staging environment"
    echo "3. Prepare rollback plan if needed"
    echo "4. Apply migration with: supabase db push"
    
    if [ -n "$backup_file" ]; then
        echo "5. Backup created at: $backup_file"
    fi
}

# Handle script interruption
trap 'print_error "Validation interrupted"; exit 1' INT TERM

# Run main function
main

print_success "Migration validation process completed!"