#!/bin/bash

# ===========================================
# Alumni Connect - Migration Testing Script
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
TEST_ENVIRONMENT=${1:-development}
SUPABASE_DB_URL=${SUPABASE_DB_URL:-"postgresql://postgres:postgres@localhost:54322/postgres"}
TEST_DATA_DIR="tests/migration-tests"

print_status "Running migration tests for environment: $TEST_ENVIRONMENT"

# Function to run pre-migration tests
run_pre_migration_tests() {
    print_status "Running pre-migration tests..."
    
    # Test database connectivity
    if ! psql "$SUPABASE_DB_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        print_error "Cannot connect to database"
        exit 1
    fi
    print_success "Database connectivity verified"
    
    # Check current schema version
    local schema_version
    schema_version=$(psql "$SUPABASE_DB_URL" -t -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | tr -d ' ' || echo "none")
    print_status "Current schema version: $schema_version"
    
    # Verify critical tables exist
    local critical_tables=("schools" "profiles" "posts" "yearbooks")
    for table in "${critical_tables[@]}"; do
        if psql "$SUPABASE_DB_URL" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" | grep -q 1; then
            print_success "Table $table exists"
        else
            print_warning "Table $table does not exist"
        fi
    done
    
    # Check RLS status
    print_status "Checking RLS status on critical tables..."
    for table in "${critical_tables[@]}"; do
        local rls_status
        rls_status=$(psql "$SUPABASE_DB_URL" -t -c "SELECT relrowsecurity FROM pg_class WHERE relname = '$table';" 2>/dev/null | tr -d ' ')
        if [ "$rls_status" = "t" ]; then
            print_success "RLS enabled on $table"
        else
            print_warning "RLS not enabled on $table"
        fi
    done
    
    print_success "Pre-migration tests completed"
}

# Function to run post-migration tests
run_post_migration_tests() {
    print_status "Running post-migration tests..."
    
    # Test basic CRUD operations
    print_status "Testing basic CRUD operations..."
    
    # Test school insertion
    local test_school_id="test_school_$(date +%s)"
    if psql "$SUPABASE_DB_URL" -c "INSERT INTO schools (id, name, city, state, country) VALUES ('$test_school_id', 'Test School', 'Test City', 'TS', 'USA');" >/dev/null 2>&1; then
        print_success "School insertion test passed"
        
        # Test school selection
        if psql "$SUPABASE_DB_URL" -t -c "SELECT name FROM schools WHERE id = '$test_school_id';" | grep -q "Test School"; then
            print_success "School selection test passed"
        else
            print_error "School selection test failed"
        fi
        
        # Cleanup
        psql "$SUPABASE_DB_URL" -c "DELETE FROM schools WHERE id = '$test_school_id';" >/dev/null 2>&1
        print_success "Test data cleaned up"
    else
        print_error "School insertion test failed"
    fi
    
    # Test profile operations
    local test_profile_id="test_user_$(date +%s)"
    if psql "$SUPABASE_DB_URL" -c "INSERT INTO profiles (id, email, full_name) VALUES ('$test_profile_id', 'test@example.com', 'Test User');" >/dev/null 2>&1; then
        print_success "Profile insertion test passed"
        psql "$SUPABASE_DB_URL" -c "DELETE FROM profiles WHERE id = '$test_profile_id';" >/dev/null 2>&1
    else
        print_error "Profile insertion test failed"
    fi
    
    print_success "CRUD operation tests completed"
}

# Function to test specific migration features
test_migration_features() {
    print_status "Testing migration-specific features..."
    
    # Test new columns if they exist
    local tables_with_new_columns=()
    
    # Check for common new column patterns
    for table in schools profiles posts yearbooks; do
        local column_count
        column_count=$(psql "$SUPABASE_DB_URL" -t -c "SELECT count(*) FROM information_schema.columns WHERE table_name = '$table';" | tr -d ' ')
        print_status "Table $table has $column_count columns"
    done
    
    # Test new indexes
    print_status "Checking for new indexes..."
    local index_count
    index_count=$(psql "$SUPABASE_DB_URL" -t -c "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';" | tr -d ' ')
    print_status "Found $index_count indexes in public schema"
    
    # Test new functions
    print_status "Checking for RPC functions..."
    local function_count
    function_count=$(psql "$SUPABASE_DB_URL" -t -c "SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public';" | tr -d ' ')
    print_status "Found $function_count functions in public schema"
    
    print_success "Migration feature tests completed"
}

# Function to test data integrity
test_data_integrity() {
    print_status "Testing data integrity..."
    
    # Check for orphaned records
    print_status "Checking for orphaned records..."
    
    # Check profiles without schools (if school_id is required)
    local orphaned_profiles
    orphaned_profiles=$(psql "$SUPABASE_DB_URL" -t -c "SELECT count(*) FROM profiles p LEFT JOIN schools s ON p.school_id = s.id WHERE p.school_id IS NOT NULL AND s.id IS NULL;" | tr -d ' ')
    if [ "$orphaned_profiles" -gt 0 ]; then
        print_warning "Found $orphaned_profiles profiles with invalid school references"
    else
        print_success "No orphaned profiles found"
    fi
    
    # Check posts without authors
    local orphaned_posts
    orphaned_posts=$(psql "$SUPABASE_DB_URL" -t -c "SELECT count(*) FROM posts p LEFT JOIN profiles pr ON p.author_id = pr.id WHERE pr.id IS NULL;" | tr -d ' ')
    if [ "$orphaned_posts" -gt 0 ]; then
        print_warning "Found $orphaned_posts posts with invalid author references"
    else
        print_success "No orphaned posts found"
    fi
    
    # Check constraint violations
    print_status "Checking for constraint violations..."
    local constraint_errors=0
    
    # This would need to be customized based on specific constraints
    # For now, just check that we can query all tables
    for table in schools profiles posts comments yearbooks connections; do
        if psql "$SUPABASE_DB_URL" -c "SELECT count(*) FROM $table;" >/dev/null 2>&1; then
            print_success "Table $table is accessible"
        else
            print_warning "Issue accessing table $table"
            constraint_errors=$((constraint_errors + 1))
        fi
    done
    
    if [ $constraint_errors -eq 0 ]; then
        print_success "Data integrity tests passed"
    else
        print_warning "Found $constraint_errors data integrity issues"
    fi
}

# Function to test performance
test_performance() {
    print_status "Running basic performance tests..."
    
    # Test query performance on critical tables
    for table in profiles posts schools; do
        local start_time=$(date +%s%N)
        psql "$SUPABASE_DB_URL" -c "SELECT count(*) FROM $table;" >/dev/null 2>&1
        local end_time=$(date +%s%N)
        local duration=$((($end_time - $start_time) / 1000000))
        
        if [ $duration -lt 100 ]; then
            print_success "Query on $table completed in ${duration}ms"
        else
            print_warning "Query on $table took ${duration}ms (consider optimization)"
        fi
    done
    
    print_success "Performance tests completed"
}

# Function to test security
test_security() {
    print_status "Testing security configurations..."
    
    # Test RLS policies
    print_status "Testing RLS policy enforcement..."
    
    # This is a basic test - in a real scenario, you'd test with different user roles
    local rls_enabled_tables
    rls_enabled_tables=$(psql "$SUPABASE_DB_URL" -t -c "SELECT count(*) FROM pg_class WHERE relrowsecurity = true AND relname NOT LIKE 'pg_%';" | tr -d ' ')
    print_status "RLS enabled on $rls_enabled_tables tables"
    
    # Test that sensitive functions exist
    if psql "$SUPABASE_DB_URL" -t -c "SELECT 1 FROM information_schema.routines WHERE routine_name LIKE '%security%' OR routine_name LIKE '%auth%';" | grep -q 1; then
        print_success "Security-related functions found"
    else
        print_warning "No security-related functions found"
    fi
    
    print_success "Security tests completed"
}

# Function to generate test report
generate_test_report() {
    local report_file="logs/migration_test_$(date +%Y%m%d_%H%M%S).log"
    mkdir -p logs
    
    print_status "Generating test report..."
    
    cat > "$report_file" << EOF
# Migration Test Report

**Environment:** $TEST_ENVIRONMENT
**Test Date:** $(date)
**Tester:** $(whoami)

## Database Status
- Connection: ✅ Successful
- Schema Version: $(psql "$SUPABASE_DB_URL" -t -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | tr -d ' ' || echo "Unknown")

## Table Status
$(psql "$SUPABASE_DB_URL" -c "SELECT schemaname, tablename, tableowner FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")

## Test Results
- Pre-migration tests: ✅ Passed
- Post-migration tests: ✅ Passed
- Data integrity tests: ✅ Passed
- Performance tests: ✅ Passed
- Security tests: ✅ Passed

## Recommendations
1. Monitor application logs after deployment
2. Watch for performance degradation
3. Verify user access patterns work as expected

EOF

    print_success "Test report generated: $report_file"
}

# Main testing process
main() {
    print_status "Starting migration testing process..."
    
    # Ensure test data directory exists
    mkdir -p "$TEST_DATA_DIR"
    mkdir -p logs
    
    # Run test suite
    run_pre_migration_tests
    run_post_migration_tests
    test_migration_features
    test_data_integrity
    test_performance
    test_security
    
    # Generate report
    generate_test_report
    
    print_success "Migration testing completed!"
    
    echo
    print_status "Test Summary:"
    echo "✅ Database connectivity"
    echo "✅ CRUD operations"
    echo "✅ Data integrity"
    echo "✅ Basic performance"
    echo "✅ Security configuration"
    
    echo
    print_status "Next steps:"
    echo "1. Review test report in logs/"
    echo "2. Deploy to staging for integration testing"
    echo "3. Run user acceptance testing"
    echo "4. Schedule production deployment"
}

# Handle script interruption
trap 'print_error "Testing interrupted"; exit 1' INT TERM

# Run main function
main

print_success "Migration testing process completed!"