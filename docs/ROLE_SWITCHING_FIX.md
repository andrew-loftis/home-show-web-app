# ROLE_SWITCHING_FIX.md

## Role Switching Logic

- **RoleSelect**: When switching away from vendor, calls `vendorLogout()` to clear vendorLoginId and role if needed.
- Calls `setRole(newRole)` to update role in store and persist.
- If vendor selected, navigates to `/vendor-login` for explicit login.
- Else, navigates to `/home`.
- Tabbar and shell subscribe to store; rerender immediately on role/vendorLoginId change.
- More view: "Reset Role & Logout" calls `vendorLogout()` and navigates to `/role`.
- Vendor login persists across sessions; switching away clears vendorLoginId.
- All views and navigation are role-aware and update reactively.
