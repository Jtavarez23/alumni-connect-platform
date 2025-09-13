# 🧪 Reconnect Hive V2 Testing Guide

## Pre-Testing Setup

### 1. Database Migration Check
**Status**: ⚠️ **REQUIRED** - Run these manually in Supabase Dashboard first:

```bash
# Check if migrations are ready
node scripts/test-v2-features.js
```

**Expected Output**: All tests should pass before proceeding.

### 2. Development Server
```bash
npm run dev
```

---

## 🎯 Feature Testing Checklist

### Phase 1: Subscription System Testing

#### Test 1: Multi-School Support
- [ ] Navigate to Profile/Education History
- [ ] Try adding multiple schools (should be limited for free users)
- [ ] Verify premium users can add unlimited schools
- [ ] Check school timeline display

**Expected Behavior:**
- Free users: Limited to 1 school with upgrade prompts
- Premium users: Unlimited schools, advanced features

#### Test 2: Search Quota System  
- [ ] Go to Alumni page
- [ ] Verify SearchQuotaWidget appears on right side
- [ ] Try searching (should consume quota for free users)
- [ ] Check quota counter updates
- [ ] Test upgrade prompts when quota is exhausted

**Expected Behavior:**
- Free users: 3 searches per day with reset timer
- Premium users: Unlimited searches, no widget shown

#### Test 3: Messaging Restrictions
- [ ] Go to Messages page
- [ ] Try messaging someone as free user
- [ ] Verify MessagingRestrictions component shows
- [ ] Test connection request flow
- [ ] Check premium users have no restrictions

**Expected Behavior:**
- Free users: Can only message network connections
- Premium users: Can message anyone

### Phase 2: Social Features Testing

#### Test 4: Social Media Integration
- [ ] Go to Settings/Profile (where SocialMediaIntegration would be)
- [ ] Add social media connections
- [ ] Verify free vs premium differences
- [ ] Test verification status display

**Expected Behavior:**
- Free users: Can add links without verification badges
- Premium users: Get verified badges and enhanced discovery

#### Test 5: Classmate Suggestions
- [ ] Navigate to suggestion page (where ClassmateSuggestionEngine would be)
- [ ] Try suggesting classmates
- [ ] Test weekly limits for free users
- [ ] Verify AI analysis feature
- [ ] Check suggestion status tracking

**Expected Behavior:**
- Free users: 5 suggestions per week
- Premium users: Unlimited suggestions with AI insights

### Phase 3: Analytics Testing (Premium Only)

#### Test 6: Profile Analytics
- [ ] Premium user: Access ProfileAnalyticsDashboard
- [ ] Verify profile view tracking
- [ ] Check analytics charts and stats
- [ ] Test different time periods

**Expected Behavior:**
- Only available for premium users
- Tracks who viewed profile and discovery sources

---

## 🐛 Common Issues & Fixes

### Issue 1: "Table does not exist" Errors
**Cause**: Database migrations not run
**Fix**: 
1. Follow `MIGRATION_INSTRUCTIONS.md`
2. Run all 3 migration files in Supabase Dashboard
3. Verify with `node scripts/test-v2-features.js`

### Issue 2: Import/Component Errors
**Common Fixes**:
```bash
# If you see import errors, check these files exist:
src/components/search/SearchQuotaWidget.tsx
src/components/messaging/MessagingRestrictions.tsx  
src/components/social/SocialMediaIntegration.tsx
src/components/suggestions/ClassmateSuggestionEngine.tsx
src/components/analytics/ProfileAnalyticsDashboard.tsx
```

### Issue 3: Supabase Connection Issues
**Fix**: Update supabase imports in components:
```typescript
// Change from:
import { supabase } from '@/lib/supabase';
// To:
import { supabase } from '@/integrations/supabase/client';
```

### Issue 4: Hook Not Found Errors
**Fix**: Ensure updated `useSubscription` hook is used:
```typescript
// Should include new methods:
const { 
  canSearch, 
  useSearch, 
  canSendMessage,
  trackProfileView,
  canSuggestClassmate 
} = useSubscription();
```

---

## 🧩 Integration Testing

### Test Integration Points:

1. **Alumni Page + Search Quota**
   - Search functionality should consume quota
   - Widget should show remaining searches
   - Upgrade prompts should appear when quota is exhausted

2. **Messages + Messaging Restrictions**
   - Free users should see restriction warnings
   - Connection requests should bypass restrictions
   - Premium users should have no restrictions

3. **Profile + Social Media**
   - Social links should display with verification status
   - Premium users should get enhanced features
   - Discovery should work through social connections

4. **Subscription System Integration**
   - All features should respect subscription tiers
   - Upgrade prompts should appear consistently
   - Premium features should be properly gated

---

## 📊 Performance Testing

### Check These Metrics:
- [ ] Page load times with new components
- [ ] Database query performance
- [ ] Search quota enforcement speed
- [ ] Real-time features (if enabled)

### Optimization Tips:
- Components use React.memo() where appropriate
- Database queries are optimized with indexes
- Subscription checks are cached
- Search quotas are efficiently tracked

---

## 🔒 Security Testing

### Verify Security Features:
- [ ] RLS policies prevent unauthorized access
- [ ] Search quotas cannot be bypassed
- [ ] Messaging restrictions are enforced server-side
- [ ] Premium features are properly gated
- [ ] User data is isolated correctly

### Test Security Scenarios:
1. Try accessing premium features as free user
2. Attempt to bypass search quotas
3. Try messaging restricted users
4. Verify data isolation between users

---

## 📋 Manual Testing Checklist

### Free User Testing:
- [ ] Can add 1 school only
- [ ] Gets 3 searches per day
- [ ] Can only message network connections
- [ ] Limited to 5 suggestions per week
- [ ] No access to profile analytics
- [ ] Social links without verification

### Premium User Testing:
- [ ] Unlimited schools
- [ ] Unlimited searches (no quota widget)
- [ ] Can message anyone
- [ ] Unlimited suggestions with AI
- [ ] Full profile analytics access
- [ ] Verified social media badges

### UI/UX Testing:
- [ ] All upgrade prompts work
- [ ] Loading states show correctly
- [ ] Error messages are user-friendly
- [ ] Mobile responsiveness maintained
- [ ] Consistent styling across components

---

## 🎉 Success Criteria

**V2 Features are working if:**

✅ **Multi-School System**: Users can manage education timeline
✅ **Subscription Tiers**: Free/Premium restrictions work correctly  
✅ **Search Quotas**: Daily limits enforced with upgrade prompts
✅ **Messaging Gates**: Network-based messaging restrictions
✅ **Social Integration**: Manual linking with verification status
✅ **AI Suggestions**: Classmate recommendations with limits
✅ **Profile Analytics**: Premium-only view tracking

**Ready for Production if:**
- All security checks pass
- Performance is acceptable
- No critical bugs found
- User experience is smooth
- Database migrations successful

---

## 🚀 Next Steps After Testing

1. **Fix Critical Issues**: Address any blocking bugs
2. **Performance Optimization**: Improve slow queries/components
3. **User Experience Polish**: Refine upgrade flows and messaging
4. **Additional Features**: Activity feed, premium checkout, UI updates
5. **Production Deployment**: Roll out to users gradually

---

**Need Help?** 
- Check browser console for errors
- Review network tab for failed API calls
- Use React Developer Tools for component debugging
- Check Supabase logs for database issues