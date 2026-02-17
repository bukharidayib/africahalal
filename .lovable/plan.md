

# Fix: Assign All Permissions to Super Administrator Role

## The Problem

The entire admin portal is currently broken for all users, including the Super Administrator. When you log in as `admin@africanhalaal.com`, you see only the Dashboard link in the sidebar, and most dashboard content is hidden. This is because:

- The `role_permissions` table (which links roles to permissions) is **completely empty** -- it has 0 rows
- Even though the "Super Administrator" role exists and is assigned to your account, it has no permissions attached
- Every page and sidebar item checks permissions before showing content, so everything is hidden

## What Will Be Fixed

A single SQL migration will insert all 70 permissions into the `role_permissions` table for the Super Administrator role. After this:

- All sidebar menu items will appear (Applications, Certificates, Inspections, Users, Roles, etc.)
- All dashboard stats, cards, and quick actions will be visible
- You will be able to access Roles & Permissions to manage other roles (like CIDO)
- You will be able to assign permissions to other roles through the Permission Matrix UI

## Technical Details

**Migration SQL:**
- Query all permission IDs from the `permissions` table
- Insert a row into `role_permissions` for each permission, linked to the Super Administrator role ID (`bfeb6e6a-83f1-42be-9f89-1f3a5fe967e1`)
- Use `ON CONFLICT DO NOTHING` to make the migration safe to re-run

**No code changes required** -- the frontend already reads permissions dynamically. Once the database has the correct data, everything will work.

| Change | Details |
|--------|---------|
| New SQL migration | Insert all 70 permissions for Super Administrator role into `role_permissions` |
| Files modified | 0 application code files -- this is purely a data fix |

