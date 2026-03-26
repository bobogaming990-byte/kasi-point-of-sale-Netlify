

## Admin Authorization for Cart Item Removal

### Problem
Currently, any cashier can freely remove items from the cart. This is a security gap — cashiers could scan items and then remove them to commit theft. Item removal from the cart should require admin credentials.

### Solution
Add an "Admin Authorization" dialog that appears when a cashier tries to remove an item (or reduce quantity) from the cart. Admin users bypass this prompt automatically.

### How It Works

1. **Cashier clicks remove/minus on a cart item** → An authorization dialog opens asking for admin username and password
2. **Admin enters credentials** → The system validates against `store.login()` and checks the role is `admin`
3. **If valid** → The item is removed (or quantity reduced)
4. **If invalid** → Show error, item stays in cart
5. **If current user is already admin** → Skip the dialog entirely, allow removal directly

### Technical Details

**File: `src/pages/Sales.tsx`**
- Add state for the auth dialog: `showAdminAuth`, `pendingAction` (stores what removal action to perform after auth), `adminUser`, `adminPass`, `authError`
- Wrap `removeFromCart` and the minus-quantity button in a guard function (`requestRemoval`) that checks if the current user role is `admin` — if yes, proceed; if no, open the dialog
- On successful admin login in the dialog, execute the pending action and close
- Use the existing `Dialog` component for a clean modal with username/password fields and Login/Cancel buttons
- The dialog will have a lock icon and clear messaging: "Admin authorization required to remove items"

**File: `src/lib/store.ts`**
- Already has `login()` returning `{ success, role }` — will reuse this for validation

**No changes needed to:**
- `AuthContext` — we validate directly against the store
- `AddProductModal` or `Inventory`

### UI
- Clean dialog with admin username + password fields
- Error message on failed auth
- Lock/Shield icon for visual clarity
- Enter key submits the auth form

