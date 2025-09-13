#!/bin/bash

# ===========================================
# Alumni Connect - Environment Setup Script
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

# Environment selection
ENV=${1:-development}

print_status "Setting up Alumni Connect environment: $ENV"

# Validate environment
if [[ ! "$ENV" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid environment: $ENV. Must be 'development', 'staging', or 'production'"
    exit 1
fi

# Create environment file from template
if [ "$ENV" = "development" ]; then
    ENV_FILE=".env.local"
    TEMPLATE_FILE=".env.local.template"
else
    ENV_FILE=".env.$ENV"
    TEMPLATE_FILE=".env.production.template"
fi

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    print_error "Template file $TEMPLATE_FILE not found"
    exit 1
fi

# Copy template to environment file
if [ -f "$ENV_FILE" ]; then
    print_warning "Environment file $ENV_FILE already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Keeping existing environment file"
        exit 0
    fi
fi

cp "$TEMPLATE_FILE" "$ENV_FILE"
print_success "Created environment file: $ENV_FILE"

# Generate JWT secret for production
if [ "$ENV" != "development" ]; then
    print_status "Generating secure JWT secret..."
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    
    # Update JWT secret in environment file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-super-secret-jwt-token-with-at-least-32-characters/$JWT_SECRET/" "$ENV_FILE"
        sed -i '' "s/your-production-jwt-secret-with-at-least-32-characters/$JWT_SECRET/" "$ENV_FILE"
    else
        # Linux
        sed -i "s/your-super-secret-jwt-token-with-at-least-32-characters/$JWT_SECRET/" "$ENV_FILE"
        sed -i "s/your-production-jwt-secret-with-at-least-32-characters/$JWT_SECRET/" "$ENV_FILE"
    fi
    
    print_success "Generated JWT secret"
fi

# Set up Docker environment file for development
if [ "$ENV" = "development" ]; then
    print_status "Setting up Docker environment..."
    
    # Create docker environment file
    cat > .env << EOF
# Docker Compose Environment Variables
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNaJ7OP2WMT5P4H7LrQqlLQJjl6o
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
API_EXTERNAL_URL=http://localhost:54321
SITE_URL=http://localhost:3000
ADDITIONAL_REDIRECT_URLS=http://localhost:3000,http://127.0.0.1:3000
DISABLE_SIGNUP=false
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
ENABLE_PHONE_SIGNUP=false
ENABLE_PHONE_AUTOCONFIRM=false
SMTP_ADMIN_EMAIL=admin@alumni-connect.local
SMTP_HOST=inbucket
SMTP_PORT=2500
SMTP_USER=
SMTP_PASS=
SMTP_SENDER_NAME=Alumni Connect
MAILER_URLPATHS_INVITE=/auth/confirm
MAILER_URLPATHS_CONFIRMATION=/auth/confirm
MAILER_URLPATHS_RECOVERY=/auth/reset-password
MAILER_URLPATHS_EMAIL_CHANGE=/auth/confirm
LOGFLARE_API_KEY=your-logflare-api-key-here
IMGPROXY_ENABLE_WEBP_DETECTION=false
PGRST_DB_SCHEMAS=public,storage,graphql_public
JWT_EXPIRY=3600
GOOGLE_ENABLED=true
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
EOF
    
    print_success "Created Docker environment file"
fi

# Validate required variables
print_status "Validating environment configuration..."

# Read environment file and check for required variables
if [ "$ENV" = "development" ]; then
    REQUIRED_VARS=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY")
else
    REQUIRED_VARS=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY" "SITE_URL" "JWT_SECRET")
fi

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$var=" "$ENV_FILE" || grep -q "^$var=your-" "$ENV_FILE" || grep -q "^$var=https://your-" "$ENV_FILE"; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_warning "The following variables need to be configured in $ENV_FILE:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    print_warning "Please update these values before starting the application"
fi

# Create directories
print_status "Creating required directories..."
mkdir -p logs
mkdir -p data/backups
mkdir -p data/uploads
mkdir -p tests/fixtures

print_success "Environment setup complete for: $ENV"

# Show next steps
echo
print_status "Next steps:"
if [ "$ENV" = "development" ]; then
    echo "1. Update OAuth credentials in $ENV_FILE if needed"
    echo "2. Run: npm run dev:setup"
    echo "3. Run: npm run dev"
else
    echo "1. Configure production values in $ENV_FILE"
    echo "2. Set up your Supabase project"
    echo "3. Configure OAuth providers"
    echo "4. Deploy using: npm run deploy:$ENV"
fi

echo
print_success "Alumni Connect environment setup completed successfully!"