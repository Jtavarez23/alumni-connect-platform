#!/bin/bash

# ===========================================
# Alumni Connect - Database Seeding Script
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
SUPABASE_DB_URL=${SUPABASE_DB_URL:-"postgresql://postgres:postgres@localhost:54322/postgres"}
SEED_FILE="supabase/seed.sql"
ENVIRONMENT=${1:-development}

print_status "Starting database seeding for environment: $ENVIRONMENT"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be 'development', 'staging', or 'production'"
    exit 1
fi

# Check if seed file exists
if [ ! -f "$SEED_FILE" ]; then
    print_error "Seed file not found: $SEED_FILE"
    exit 1
fi

# Function to run SQL file
run_sql_file() {
    local file=$1
    local description=$2
    
    print_status "$description"
    
    if command -v psql >/dev/null 2>&1; then
        psql "$SUPABASE_DB_URL" -f "$file" -v ON_ERROR_STOP=1
    elif command -v supabase >/dev/null 2>&1; then
        supabase db reset --debug
    else
        print_error "Neither psql nor supabase CLI found. Please install one of them."
        exit 1
    fi
}

# Function to check database connectivity
check_db_connection() {
    print_status "Checking database connection..."
    
    if command -v psql >/dev/null 2>&1; then
        if psql "$SUPABASE_DB_URL" -c "SELECT 1;" >/dev/null 2>&1; then
            print_success "Database connection successful"
        else
            print_error "Cannot connect to database. Make sure Supabase is running."
            print_status "To start Supabase: npm run dev:db"
            exit 1
        fi
    else
        print_warning "psql not found, skipping connection check"
    fi
}

# Function to backup existing data (for production)
backup_data() {
    if [ "$ENVIRONMENT" = "production" ]; then
        print_status "Creating backup of existing data..."
        local backup_file="data/backups/backup_$(date +%Y%m%d_%H%M%S).sql"
        mkdir -p data/backups
        
        if command -v pg_dump >/dev/null 2>&1; then
            pg_dump "$SUPABASE_DB_URL" > "$backup_file"
            print_success "Backup created: $backup_file"
        else
            print_warning "pg_dump not found, skipping backup"
        fi
    fi
}

# Function to create test users
create_test_users() {
    if [ "$ENVIRONMENT" = "development" ]; then
        print_status "Creating test users..."
        
        cat << 'EOF' | psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1
-- Create test users in auth.users table
INSERT INTO auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    phone_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, created_at, updated_at,
    instance_id, raw_app_meta_data, raw_user_meta_data, is_super_admin,
    confirmation_sent_at, recovery_sent_at, email_change_sent_at,
    email_change_token_current, email_change_confirm_status
) VALUES 
('usr_001', 'authenticated', 'authenticated', 'john.smith@email.com', 
 crypt('testpassword123', gen_salt('bf')), NOW(), 
 NULL, '', '', '', '', NOW(), NOW(),
 '00000000-0000-0000-0000-000000000000', 
 '{"provider": "email", "providers": ["email"]}', 
 '{"full_name": "John Smith"}', false,
 NULL, NULL, NULL, '', 0),
('usr_002', 'authenticated', 'authenticated', 'sarah.johnson@email.com', 
 crypt('testpassword123', gen_salt('bf')), NOW(), 
 NULL, '', '', '', '', NOW(), NOW(),
 '00000000-0000-0000-0000-000000000000', 
 '{"provider": "email", "providers": ["email"]}', 
 '{"full_name": "Sarah Johnson"}', false,
 NULL, NULL, NULL, '', 0),
('usr_admin', 'authenticated', 'authenticated', 'admin@alumni-connect.dev', 
 crypt('adminpassword123', gen_salt('bf')), NOW(), 
 NULL, '', '', '', '', NOW(), NOW(),
 '00000000-0000-0000-0000-000000000000', 
 '{"provider": "email", "providers": ["email"]}', 
 '{"full_name": "Admin User", "role": "admin"}', false,
 NULL, NULL, NULL, '', 0)
ON CONFLICT (id) DO NOTHING;
EOF
        
        print_success "Test users created"
    fi
}

# Function to verify seed data
verify_seed_data() {
    print_status "Verifying seed data..."
    
    local verification_query="
    SELECT 
        'schools' as table_name, COUNT(*) as count FROM schools
    UNION ALL
    SELECT 'profiles', COUNT(*) FROM profiles
    UNION ALL  
    SELECT 'posts', COUNT(*) FROM posts
    UNION ALL
    SELECT 'yearbooks', COUNT(*) FROM yearbooks
    UNION ALL
    SELECT 'connections', COUNT(*) FROM connections
    UNION ALL
    SELECT 'comments', COUNT(*) FROM comments;
    "
    
    if command -v psql >/dev/null 2>&1; then
        echo "$verification_query" | psql "$SUPABASE_DB_URL" -t -A -F $'\t'
        print_success "Seed data verification completed"
    else
        print_warning "psql not found, skipping verification"
    fi
}

# Function to set up development-specific data
setup_development_data() {
    if [ "$ENVIRONMENT" = "development" ]; then
        print_status "Setting up development-specific configurations..."
        
        cat << 'EOF' | psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1
-- Disable RLS for easier development testing
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

-- Enable RLS back (comment out above lines in production)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create development-specific indexes
CREATE INDEX IF NOT EXISTS idx_dev_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_dev_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_dev_connections_status ON connections(status);
EOF
        
        print_success "Development configurations applied"
    fi
}

# Main execution
main() {
    print_status "Alumni Connect Database Seeding - Environment: $ENVIRONMENT"
    
    # Pre-flight checks
    check_db_connection
    
    # Backup data for production
    backup_data
    
    # Run migrations first if needed
    if command -v supabase >/dev/null 2>&1; then
        print_status "Running database migrations..."
        supabase db reset --debug
        print_success "Migrations applied"
    fi
    
    # Run seed script
    run_sql_file "$SEED_FILE" "Running seed data script"
    
    # Create test users for development
    create_test_users
    
    # Apply development-specific setup
    setup_development_data
    
    # Verify the results
    verify_seed_data
    
    print_success "Database seeding completed successfully!"
    
    # Print next steps
    echo
    print_status "Next steps:"
    if [ "$ENVIRONMENT" = "development" ]; then
        echo "1. Test login with:"
        echo "   - Email: john.smith@email.com"
        echo "   - Password: testpassword123"
        echo "2. Admin access:"
        echo "   - Email: admin@alumni-connect.dev" 
        echo "   - Password: adminpassword123"
        echo "3. Start the development server: npm run dev"
    else
        echo "1. Verify data in your $ENVIRONMENT database"
        echo "2. Update any production-specific configurations"
        echo "3. Deploy your application"
    fi
}

# Handle script interruption
trap 'print_error "Script interrupted"; exit 1' INT TERM

# Run main function
main

print_success "Alumni Connect database seeding process completed!"