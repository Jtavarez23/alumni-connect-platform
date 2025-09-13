# Security Guidelines for Reconnect Hive

## Critical Security Requirements

### 🔴 IMMEDIATE ACTIONS REQUIRED

1. **ROTATE ALL EXPOSED CREDENTIALS**
   - Supabase Service Role Key
   - Database Password  
   - Supabase Project ID and URL
   - Any other exposed API keys

2. **ENVIRONMENT CONFIGURATION**
   - Use `.env.local` for development (gitignored)
   - Use `.env.production` for production (gitignored)
   - NEVER commit actual credentials to version control
   - Use `.env.example` for documentation only

### 🛡️ Authentication Security

#### Password Policies
```typescript
// Minimum requirements:
- 12+ characters
- Uppercase and lowercase letters
- Numbers and special characters
- Not in common password lists
- No personal information
```

#### Rate Limiting (Required)
- Max 5 login attempts per minute per IP
- Account lock after 10 failed attempts (30 min cooldown)
- CAPTCHA after 3 failed attempts
- Rate limit signup requests (1 per minute per IP)

#### Session Security
- Use HTTP-only cookies for session tokens
- Secure flag for HTTPS only
- SameSite=Strict for CSRF protection
- Short expiration (24 hours for sessions)

### 🚫 Error Handling
- NEVER expose detailed error messages to users
- Use generic messages: "Invalid credentials", "Server error"
- Log detailed errors server-side only
- Implement centralized error handling

### 🔐 Input Validation
- Validate ALL user inputs server-side
- Sanitize HTML content to prevent XSS
- Use parameterized queries (Supabase handles this)
- Validate file uploads (type, size, content)

### 🌐 Network Security
- Force HTTPS in production
- Implement proper CORS configuration
- Security headers (see vercel.json)
- Content Security Policy (CSP)

### 📊 Monitoring & Logging
- Log all authentication attempts (success/failure)
- Monitor for brute force patterns
- Alert on suspicious activity
- Regular security audits

## Environment Setup

### Development
```bash
# Create .env.local (gitignored)
cp .env.example .env.local
# Edit with development credentials
```

### Production  
```bash
# Create .env.production (gitignored) 
cp .env.example .env.production
# Edit with production credentials
# Set on deployment platform (Vercel, Netlify, etc.)
```

## Emergency Response

If credentials are exposed:
1. Immediately rotate ALL affected keys
2. Review access logs for suspicious activity
3. Notify affected users if necessary
4. Conduct security audit

## Regular Maintenance

- Monthly: Rotate service keys
- Quarterly: Security penetration testing  
- Annually: Comprehensive security audit
- Continuous: Dependency vulnerability scanning

---

**Remember**: Security is not a feature, it's a process. Always err on the side of caution.