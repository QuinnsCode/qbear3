# Admin Access Setup

## Super Admin Configuration

Only **YOU** (the repo owner) should be a super admin. Regular organization subdomain users are NOT admins.

### Step 1: Get Your User ID

Visit your profile page or run this in your browser console while logged in:
```javascript
// Check local storage or network requests to find your user ID
```

Or query the database:
```bash
npx wrangler d1 execute qntbr-db1 --remote --command "SELECT id, email, name FROM User WHERE email = 'your-email@example.com'"
```

### Step 2: Add Your Credentials

Edit `src/lib/auth/adminCheck.ts`:

```typescript
const SUPER_ADMIN_IDS = [
  'YOUR-USER-ID-HERE',  // ← Add your user ID
];

const SUPER_ADMIN_EMAILS = [
  'your-email@example.com',  // ← Add your email
];
```

### Step 3: (Optional) Set Role in Database

```bash
npx wrangler d1 execute qntbr-db1 --remote --command "UPDATE User SET role = 'super_admin' WHERE id = 'YOUR-USER-ID'"
```

## Protected Endpoints

### Admin Pages
- `/admin/cache` - Cache browser (super admin only)
- `/admin` - Admin dashboard (if exists)

### API Endpoints
- `/api/admin/test-cache` - Test cache operations
- `/api/admin/inspect-deck` - Inspect deck data
- `/api/admin/fetch-basic-lands` - Fetch fresh basic lands
- `/api/admin/cache-stats` - Cache statistics
- `/api/admin/cache-warming` - Cache warming operations

All return **403 Forbidden** if accessed by non-super-admin users.

## Security Notes

1. **Super admin IDs are hardcoded** in `adminCheck.ts`
2. **Organization owners are NOT admins** by default
3. **Subdomain users have ZERO admin access**
4. Only you can access admin endpoints

## Testing

1. Log in as yourself
2. Visit `/admin/cache` - should work ✅
3. Log in as a different user (or organization owner)
4. Visit `/admin/cache` - should get 403 ❌

## Adding Other Admins (Optional)

If you want to grant admin access to someone else:

```bash
# Make them a regular admin (not super admin)
npx wrangler d1 execute qntbr-db1 --remote --command "UPDATE User SET role = 'admin' WHERE id = 'THEIR-USER-ID'"
```

Or add their ID to `SUPER_ADMIN_IDS` array in `adminCheck.ts`.
