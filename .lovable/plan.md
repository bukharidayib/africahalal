
# Implementation Plan

This plan covers four areas: Admin Billing CRUD dialogs, Sign Up page redesign, Client business entity management, and Reset Password functionality.

---

## 1. Admin Billing -- Full CRUD Dialogs

The current `AdminBilling.tsx` only has a Create dialog and inline status dropdown. We need to add proper View, Edit, and Delete dialogs.

**Changes to `src/admin/pages/AdminBilling.tsx`:**
- **View Dialog**: Clicking an invoice number opens a detail dialog showing all invoice fields, activity log, and payment transactions
- **Edit Dialog**: An "Edit" button per row opens a dialog to modify organization, fee type, amount, due date, description, and status
- **Delete Dialog**: A "Delete" button with a confirmation AlertDialog that removes the invoice (requires adding a DELETE RLS policy)
- Add an Actions column with View/Edit/Delete icon buttons
- Each action in its own Dialog/AlertDialog component

**Database change**: Add DELETE policy on `invoices` table for admin users so they can remove invoices.

---

## 2. Sign Up Page Redesign

The current SignUp page is titled "Register Business" with Company Name as the first field. It needs to become a user registration page.

**Changes to `src/pages/auth/SignUp.tsx`:**
- Change title from "Register Business" to "Create Account"
- Remove the Company Name field entirely (business registration moves to the client portal)
- Keep fields: **Full Name**, **Phone Number** (new), **NRC**, **Email**, **Password**, **Confirm Password** (new)
- **Strong Password Validation**: Real-time strength indicator checking: min 8 chars, uppercase, lowercase, number, special character
- **Generate Strong Password** button: Generates a random 16-char password with mixed characters, auto-fills both password fields
- **Show/Hide password** toggle for both fields
- Password match validation on confirm password field
- Remove the organization creation logic from handleSubmit (no longer creating org on signup)
- Add `phone` field to the Supabase auth metadata and update the profile after signup

**Database change**: The `profiles` table already has a `phone` column, so no migration needed. We need to add an `nrc` column to profiles.

---

## 3. Client Business Entity Registration

Each client can own multiple companies. We need a new "My Businesses" section in the client portal where they register entities, and then select one when applying.

**New table `client_businesses`:**
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users, NOT NULL)
- `entity_name` (text, NOT NULL)
- `pacra_number` (text, NOT NULL, unique per user)
- `created_at` (timestamptz)
- `organization_id` (uuid, FK to organizations, nullable -- linked after admin processing)

RLS: Users can only manage their own businesses.

**New page `src/pages/client/MyBusinesses.tsx`:**
- List of registered businesses with entity name and PACRA number
- Add Business dialog (entity name + PACRA number)
- Edit and Delete dialogs
- Navigation added to ClientSidebar

**Changes to `src/pages/client/CertificationApplication.tsx`:**
- Step 1 "Establishment Details" -- replace the free-text entity name and registration number fields with a dropdown that loads from `client_businesses`
- The dropdown populates entity_name and registration_number automatically
- Keep address, employees, and city fields as manual input
- Add a "Register New Business" link that navigates to My Businesses page

**Route addition in `App.tsx`:**
- `/client/businesses` -> `MyBusinesses`

**Sidebar update in `ClientSidebar.tsx`:**
- Add "My Businesses" nav item with Building2 icon, placed after Dashboard

---

## 4. Reset Password -- Working End-to-End

The current `ForgotPassword.tsx` is a UI mockup -- it uses `setTimeout` instead of calling Supabase. We need to make it functional.

**Changes to `src/pages/auth/ForgotPassword.tsx`:**
- Replace the simulated timeout with `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth/reset-password' })`
- Track the email in state so the success message can reference it

**New page `src/pages/auth/ResetPassword.tsx`:**
- Listens for the Supabase auth recovery event via `onAuthStateChange`
- Shows a form with New Password and Confirm Password fields
- Same strong password validation and generator as SignUp
- Calls `supabase.auth.updateUser({ password })` to set the new password
- On success, redirects to `/auth/signin`

**Route addition in `App.tsx`:**
- `/auth/reset-password` -> `ResetPassword`

---

## Technical Summary

### Database Migration
- Add `nrc` column (text, nullable) to `profiles` table
- Create `client_businesses` table with RLS policies
- Add DELETE policy on `invoices` for admin users

### New Files
- `src/pages/client/MyBusinesses.tsx` -- Business entity management
- `src/pages/auth/ResetPassword.tsx` -- New password form after email link

### Modified Files
- `src/admin/pages/AdminBilling.tsx` -- Add View/Edit/Delete dialogs
- `src/pages/auth/SignUp.tsx` -- Redesign to user signup with strong password
- `src/pages/auth/ForgotPassword.tsx` -- Connect to Supabase auth
- `src/pages/client/CertificationApplication.tsx` -- Business dropdown in Step 1
- `src/components/layout/ClientSidebar.tsx` -- Add My Businesses nav item
- `src/App.tsx` -- Add new routes
- `src/integrations/supabase/types.ts` -- Update types for new table
