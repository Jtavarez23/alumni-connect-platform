# Alumni Connect - Local Development Environment Setup Guide

## 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:

### Required Software
- **Node.js 18.x or higher** - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **Supabase CLI** - Install via: `npm install -g @supabase/supabase-cli`

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: At least 5GB free space
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

---

## 🚀 Step-by-Step Setup Instructions

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone [your-repository-url]
cd reconnect-hive

# Verify you're in the correct directory
ls -la
# You should see: package.json, supabase/ folder, src/ folder, etc.
```

### Step 2: Install Dependencies

```bash
# Install all Node.js dependencies
npm install

# Install additional required dependencies (prevents common startup issues)
npm install @emotion/react @emotion/styled

# Verify installation completed successfully
npm list --depth=0
# Should show all dependencies without errors
```

### Step 3: Start Docker Desktop

1. **Launch Docker Desktop** application
2. **Wait for Docker to fully start** (green status indicator)
3. **Verify Docker is running**:
   ```bash
   docker --version
   # Should output: Docker version 20.x.x or higher
   ```

### Step 4: Initialize Supabase Local Environment

```bash
# Start the local Supabase stack
npm run db:start

# Wait for all services to start (this may take 2-3 minutes on first run)
# You should see output similar to:
# Started supabase local development setup.
# 
#          API URL: http://localhost:54321
#      GraphQL URL: http://localhost:54321/graphql/v1
#           DB URL: postgresql://postgres:postgres@localhost:54322/postgres
#       Studio URL: http://localhost:54323
#     Inbucket URL: http://localhost:54324
```

### Step 5: Verify Environment Configuration

Check that your `.env` file has the correct local development settings:

```bash
# Display environment configuration
cat .env | head -20

# Required values should be:
# VITE_SUPABASE_URL=http://localhost:54321
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNaJ7OP2WMT5P4H7LrQqlLQJjl6o
```

**Important**: If your `.env` file is missing or has incorrect values, the application will not work properly.

### Step 6: Apply Database Schema and Seed Data

```bash
# Reset database with all migrations and seed data
npm run db:reset

# If you encounter migration errors, run this alternative:
npx supabase db reset --debug

# Apply the custom seed data we created
node apply_seed.js
```

**Expected Output**:
- ✅ Connected to Supabase successfully
- 📚 Creating sample schools...
- ✅ Schools created successfully
- 🗓️ Creating class years...
- ✅ Class years created successfully

### Step 7: Start the Development Server

```bash
# Start the frontend development server
npm run dev:app

# Alternative: Start both database and frontend together
npm run dev
```

**Expected Output**:
```
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://[your-ip]:3000/
  ➜  ready in [time]ms.
```

---

## 🌐 Accessing the Application

### Frontend Application
- **URL**: http://localhost:3000
- **Description**: Main Alumni Connect application interface
- **Features Available**: Login, Registration, School Browser, Profile Management

### Supabase Studio (Database Admin)
- **URL**: http://localhost:54323
- **Description**: Database administration interface
- **Use For**: Viewing tables, running SQL queries, managing data

### API Endpoint
- **URL**: http://localhost:54321
- **Description**: Supabase REST API
- **Use For**: Direct API testing and development

### Email Testing (Inbucket)
- **URL**: http://localhost:54324
- **Description**: Local email server for testing email functionality
- **Use For**: Viewing signup confirmation emails, password reset emails

---

## 🔧 Development Commands Reference

### Database Operations
```bash
# Start database only
npm run db:start

# Stop database
npm run db:stop

# Restart database (full reset)
npm run db:restart

# Reset database with all migrations
npm run db:reset

# Create a new migration
npm run migration:new "migration_name"
```

### Application Development
```bash
# Start development server (frontend only)
npm run dev:app

# Start full development stack (database + frontend)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Run tests
npm run test
```

### Docker Operations
```bash
# Start Docker services
npm run docker:up

# Stop Docker services
npm run docker:down

# View Docker logs
npm run docker:logs

# Reset Docker completely
npm run docker:reset
```

---

## 🎯 Testing the Setup

### 1. Verify Database Connection
Visit http://localhost:54323 and check:
- [ ] Can access Supabase Studio
- [ ] See `schools` table with sample data
- [ ] See `profiles` table (may be empty initially)
- [ ] See `class_years` table with entries

### 2. Test Frontend Application
Visit http://localhost:3000 and verify:
- [ ] Page loads without errors
- [ ] Can navigate between different sections
- [ ] School search/browsing works
- [ ] No console errors in browser developer tools

### 3. Test API Connectivity
```bash
# Test API endpoint directly
curl http://localhost:54321/rest/v1/schools \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZUDjTM="

# Should return JSON data of schools
```

---

## 🐛 Troubleshooting Guide

### Common Issue #1: Docker Not Running
**Symptoms**: `Cannot connect to the Docker daemon`
**Solution**:
1. Start Docker Desktop application
2. Wait for it to fully initialize (green status)
3. Retry the setup commands

### Common Issue #2: Port Already in Use
**Symptoms**: `Port 54321 already in use`
**Solution**:
```bash
# Stop existing Supabase instance
npx supabase stop

# Kill any processes using the ports
npx kill-port 3000
npx kill-port 54321
npx kill-port 54322
npx kill-port 54323

# Restart the setup
npm run db:start
```

### Common Issue #3: Migration Errors
**Symptoms**: `relation "table_name" does not exist`
**Solution**:
```bash
# Stop Supabase
npx supabase stop

# Reset completely
npx supabase db reset --debug

# If still failing, check migration dependencies:
ls supabase/migrations/ | head -5
# Ensure migrations are in chronological order
```

### Common Issue #4: Frontend Won't Start
**Symptoms**: `Module not found` or `Cannot resolve dependency`
**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules
rm package-lock.json
npm install

# Try starting again
npm run dev:app
```

### Common Issue #5: Environment Variables Not Loading
**Symptoms**: API calls failing, "Invalid API key" errors
**Solution**:
1. Verify `.env` file exists in root directory
2. Check that `.env` has correct values (see Step 5)
3. Restart the development server
4. Clear browser cache and cookies

### Common Issue #6: Emotion React Import Errors
**Symptoms**: `Failed to resolve import "@emotion/react/jsx-dev-runtime"` errors
**Solution**:
```bash
# Install missing emotion dependencies
npm install @emotion/react @emotion/styled

# Kill any processes using port 3000
taskkill //F //PID [PID_NUMBER]
# (Get PID from: netstat -ano | findstr :3000)

# Clear Vite cache
rm -rf node_modules/.vite

# Restart development server
npm run dev:app
```

### Common Issue #7: "Site Can't Be Reached" at localhost:3000
**Symptoms**: Browser shows "This site can't be reached" for http://localhost:3000
**Root Cause**: Development server failed to start due to dependency issues
**Complete Solution**:
```bash
# 1. Navigate to project directory
cd "C:\Users\[YourUsername]\reconnect-hive"

# 2. Install missing dependencies
npm install @emotion/react @emotion/styled

# 3. Check what's using port 3000
netstat -ano | findstr :3000

# 4. Kill the process (replace XXXXX with actual PID)
taskkill //F //PID XXXXX

# 5. Clear build cache
rm -rf node_modules/.vite

# 6. Start development server
npm run dev:app

# 7. Verify success - you should see:
# ✅ VITE v5.x.x ready in XXXms
# ➜ Local: http://localhost:3000/
```

---

## 📊 Development Workflow

### Daily Development Routine
1. **Start Services**:
   ```bash
   npm run dev  # Starts both database and frontend
   ```

2. **Make Changes**: Edit code in your IDE

3. **Test Changes**: Application auto-reloads on file changes

4. **Database Changes** (if needed):
   ```bash
   npm run migration:new "your_migration_name"
   # Edit the migration file
   npm run db:reset  # Apply migration
   ```

### Before Committing Code
```bash
# Run linting and tests
npm run lint
npm run test

# Build to ensure no build errors
npm run build

# Test the built application
npm run preview
```

---

## 🎓 Sample Data Overview

The setup includes comprehensive test data:

### Schools
- **Springfield High School** (High School, Illinois)
- **Riverside Academy** (High School, California)
- **Stanford University** (University, California)
- **Harvard University** (University, Massachusetts)
- **Lincoln Middle School** (Middle School, Illinois)

### Test Users
- **Sarah Johnson** (Free tier, Springfield High)
- **Mike Chen** (Premium tier, Riverside Academy)
- **Emma Davis** (Free tier, Stanford University)

### Features Populated
- Class years (2000-2030 for each school)
- User profiles with different subscription tiers
- Sample social posts and interactions
- Friendship connections
- Messaging permissions

---

## 📞 Getting Help

If you encounter issues not covered in this guide:

1. **Check the Console**: Look for error messages in terminal and browser console
2. **Review Logs**: Check Docker logs with `npm run docker:logs`
3. **Database Issues**: Use Supabase Studio at http://localhost:54323
4. **Reset Everything**: Use `npm run docker:reset && npm run db:reset`

---

## ✅ Setup Complete!

Once you've successfully completed all steps:

- 🌐 **Frontend**: http://localhost:3000
- 🗄️ **Database Admin**: http://localhost:54323
- 📧 **Email Testing**: http://localhost:54324
- 🔗 **API**: http://localhost:54321

**You're ready to start developing Alumni Connect! 🚀**

---

## 📝 Development Notes

### Project Structure
```
reconnect-hive/
├── src/                    # Frontend React application
├── supabase/              # Database migrations and configuration
├── scripts/               # Development and deployment scripts
├── .env                   # Local environment variables
├── package.json           # Node.js dependencies and scripts
└── LOCAL_DEVELOPMENT_SETUP.md (this file)
```

### Key Technologies
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Development**: Docker for local database
- **Deployment**: Vercel (production ready)

### Environment Alignment
This local setup mirrors the production environment to ensure:
- ✅ Consistent behavior across environments
- ✅ Database schema matches production
- ✅ Authentication flows work identically
- ✅ API responses are consistent
- ✅ UI components render correctly