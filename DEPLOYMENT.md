# Alumni Connect - Production Deployment Guide

## 🚀 Quick Deployment

### Prerequisites
- Node.js 18+
- Supabase project (production)
- Vercel account (or alternative hosting)
- Sentry account (for error monitoring)
- Google Analytics account (for tracking)

### 1. Environment Setup

Create production environment variables in your hosting platform:

#### Required Variables
```bash
# Supabase
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key

# App Configuration
VITE_APP_URL=https://your-domain.com
VITE_APP_NAME=Alumni Connect
VITE_APP_VERSION=1.0.0
```

#### Optional but Recommended
```bash
# Analytics
VITE_GA_TRACKING_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=true

# Error Monitoring
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
VITE_SENTRY_ENVIRONMENT=production
VITE_ENABLE_ERROR_MONITORING=true

# Sentry Build Integration (for source maps)
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project  
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Feature Flags
VITE_ENABLE_DEBUG=false
```

### 2. Deployment Options

#### Option A: Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

```bash
# Deploy manually
npm run build
vercel --prod
```

#### Option B: Netlify
1. Connect GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables

#### Option C: Self-hosted
```bash
# Build for production
npm run build

# Serve with your preferred static server
# Example with nginx, apache, or node.js server
```

### 3. GitHub Actions Setup

The CI/CD pipeline is already configured in `.github/workflows/deploy.yml`

Required GitHub Secrets:
```bash
# Vercel deployment
VERCEL_TOKEN=your-vercel-token
ORG_ID=your-vercel-org-id  
PROJECT_ID=your-vercel-project-id

# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Performance Monitoring

#### Sentry Error Monitoring
1. Create Sentry project
2. Get DSN from project settings
3. Set `VITE_SENTRY_DSN` environment variable
4. Errors will be automatically captured

#### Google Analytics
1. Create GA4 property  
2. Get Measurement ID (G-XXXXXXXXXX)
3. Set `VITE_GA_TRACKING_ID` environment variable
4. User events will be tracked automatically

### 5. Production Checklist

Before deploying to production:

- [ ] ✅ Supabase production database configured
- [ ] ✅ RLS policies tested and working
- [ ] ✅ Environment variables set correctly
- [ ] ✅ Domain configured (HTTPS enabled)
- [ ] ✅ Error monitoring active (Sentry)
- [ ] ✅ Analytics tracking working (GA4)
- [ ] ✅ Mobile responsiveness tested
- [ ] ✅ Performance optimized (Lighthouse score >90)
- [ ] ✅ Security headers configured
- [ ] ✅ CDN configured for static assets

### 6. Post-Deployment

#### Monitor Application Health
- Check Sentry for errors
- Monitor GA4 for user activity  
- Verify all features working correctly
- Test mobile experience on real devices

#### Performance Optimization
- Enable CDN for static assets
- Configure caching headers
- Monitor Core Web Vitals
- Optimize images and assets

### 7. Maintenance

#### Regular Updates
```bash
# Update dependencies
npm update

# Security audit
npm audit --fix

# Build and test
npm run build
```

#### Database Maintenance
- Monitor Supabase usage
- Review and optimize queries
- Update RLS policies as needed
- Backup database regularly

---

## 🔧 Configuration Details

### Build Configuration
- Code splitting enabled
- Production console.log removal
- Source maps for debugging
- Asset optimization
- Security headers configured

### Security Features
- Content Security Policy headers
- XSS protection
- Frame options denial
- Secure referrer policy

### Performance Features
- Lazy loading for routes and components
- Code splitting by feature
- Asset caching optimization
- Mobile-first responsive design

---

## 📞 Support

For deployment issues:
1. Check environment variables
2. Review build logs
3. Test locally with `npm run build && npm run preview`
4. Check Sentry for runtime errors
5. Verify Supabase connection

**Ready for production! 🚀**