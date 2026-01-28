

## Implementation Plan: Enhanced Admin Panel with Full Client Portal Tracking, Support Management, and Dynamic RBAC

This plan addresses three major requirements:
1. **Client Portal Tracking**: Admin dashboard and modules that track all client activities (applications, documents, inspections, etc.)
2. **Support Management**: Admin interface for managing support tickets and responding to live chats
3. **Dynamic RBAC System**: Professional role-based access control with customizable roles and permissions

---

## Overview of Changes

```text
+--------------------------------------------------------------------+
|                      ADMIN PORTAL NAVIGATION                        |
+--------------------------------------------------------------------+
| Dashboard | Applications | Certificates | Inspections | Inspectors |
+--------------------------------------------------------------------+
| Enforcement | Support Center | Audit Logs | User Management        |
+--------------------------------------------------------------------+
|                     Roles & Permissions | Settings                  |
+--------------------------------------------------------------------+
```

---

## 1. Enhanced Admin Dashboard with Client Activity Tracking

### Current State
- Dashboard shows basic stats (total applications, pending review, certificates, etc.)
- No real-time activity feed
- No quick access to recent client activities

### Solution
Enhance the dashboard to show:
- Real-time activity feed (new applications, document uploads, ticket creations)
- Recent client activities across all modules
- Quick action buttons to jump to relevant items
- Support queue indicator with unread count

### Dashboard Enhancements

```text
+-----------------------------------------------------------------------+
| ADMIN DASHBOARD                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
| [Stats Cards - existing]                                               |
|                                                                        |
+-----------------------------------------------------------------------+
| RECENT ACTIVITY FEED                    | SUPPORT QUEUE               |
|                                         |                              |
| [icon] New application submitted        | Open Tickets: 12            |
|        APP-2026... | 2 min ago          | Unread Messages: 5          |
|                                         | Active Chats: 3             |
| [icon] Document uploaded                |                              |
|        Business Registration | 15 min   | [View Support ->]           |
|                                         |                              |
| [icon] Support ticket created           +------------------------------+
|        TKT-001234 | 1 hour ago          |                              |
|                                         | QUICK ACTIONS                |
| [icon] Chat session started             | [New Application]            |
|        Client: John Doe | 2 hours       | [Schedule Inspection]        |
|                                         | [Issue Certificate]          |
+-----------------------------------------------------------------------+
```

---

## 2. Admin Support Center Module

### New Routes
- `/admin/support` - Support center dashboard
- `/admin/support/tickets` - All tickets list
- `/admin/support/tickets/:id` - Ticket detail with reply
- `/admin/support/chats` - Live chat sessions
- `/admin/support/chats/:id` - Individual chat window

### Support Dashboard

```text
+-----------------------------------------------------------------------+
| SUPPORT CENTER                                                         |
+-----------------------------------------------------------------------+
|                                                                        |
| [Open: 12] [In Progress: 5] [Resolved: 45] [Closed: 128]              |
|                                                                        |
+-----------------------------------------------------------------------+
| ACTIVE CHATS                            | RECENT TICKETS              |
|                                         |                              |
| [Online] John Doe                       | TKT-001234 | Document Issue |
|          Last: "Hello, I need help..."  | Open | Normal | 2 min ago   |
|          [Join Chat]                    |                              |
|                                         | TKT-001233 | Payment Query  |
| [Online] Jane Smith                     | Open | High | 1 hour ago    |
|          Last: "Thanks for waiting"     |                              |
|          [Join Chat]                    | TKT-001232 | Login Problem  |
|                                         | In Progress | 3 hours ago   |
| [Waiting] Bob Wilson                    |                              |
|          No messages yet                | [View All Tickets ->]        |
|          [Join Chat]                    |                              |
+-----------------------------------------------------------------------+
```

### Ticket Management

```text
+-----------------------------------------------------------------------+
| SUPPORT TICKETS                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
| [Search...] [Status ▼] [Priority ▼] [Category ▼] [Date Range ▼]       |
|                                                                        |
+-----------------------------------------------------------------------+
| Ticket #   | Subject          | Client    | Status | Priority | Date  |
+-----------------------------------------------------------------------+
| TKT-001234 | Document Issue   | John Doe  | Open   | Normal   | Today |
| TKT-001233 | Payment Query    | Jane S.   | Open   | High     | Today |
| TKT-001232 | Login Problem    | Bob W.    | In Prog| Normal   | Yday  |
+-----------------------------------------------------------------------+
```

### Ticket Detail with Admin Reply

```text
+-----------------------------------------------------------------------+
| TKT-001234 - Document Upload Issue                    [Open ▼]        |
+-----------------------------------------------------------------------+
| Client: John Doe | john@example.com | Org: Global Foods Co.           |
| Created: 28 Jan 2026, 10:30 AM | Category: Technical                  |
+-----------------------------------------------------------------------+
| CONVERSATION                                                           |
|                                                                        |
| [Client] 10:30 - I'm having trouble uploading my business...          |
|                                                                        |
| [Support] 10:45 - Hi John, I'll look into this for you...             |
|                                                                        |
| [Client] 11:00 - Thank you, I'm still getting an error...             |
|                                                                        |
+-----------------------------------------------------------------------+
| REPLY                                                                  |
| [_________________________________________________]                   |
| [Send Reply] [Mark as Resolved] [Close Ticket]                        |
+-----------------------------------------------------------------------+
```

### Live Chat Management

```text
+-----------------------------------------------------------------------+
| LIVE CHAT - John Doe                                    [End Session] |
+-----------------------------------------------------------------------+
| Client Info:                                                           |
| Email: john@example.com | Org: Global Foods Co.                       |
| Applications: 2 | Tickets: 3 | Member since: Jan 2026                 |
+-----------------------------------------------------------------------+
| CHAT                                                                   |
|                                                                        |
| [Client] Hello, I need help with my application                       |
|                                                                        |
| [You] Hi John! I'd be happy to help. What seems to be the issue?     |
|                                                                        |
| [Client] I'm trying to add products but the form isn't working        |
|                                                                        |
+-----------------------------------------------------------------------+
| [Type your message...                              ] [Send]           |
+-----------------------------------------------------------------------+
| QUICK RESPONSES                                                        |
| [Greeting] [Looking into it] [Please wait] [Resolved?]                |
+-----------------------------------------------------------------------+
```

---

## 3. Dynamic RBAC System

### Current State
- 4 fixed roles: super_admin, certification_officer, finance_officer, it_system_auditor
- Permissions are hardcoded in `src/admin/lib/permissions.ts`
- No UI to create custom roles or modify permissions

### Solution
Create a professional RBAC system with:
1. **Permissions Table**: Define all available permissions
2. **Roles Table**: Define roles with metadata
3. **Role-Permission Mapping**: Link roles to their permissions
4. **User-Role Assignment**: Existing, but enhanced UI

### Database Schema Changes

```sql
-- 1. Permissions Definition Table
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,  -- e.g., 'applications.view', 'certificates.issue'
    name TEXT NOT NULL,          -- e.g., 'View Applications'
    description TEXT,
    category TEXT NOT NULL,      -- e.g., 'Applications', 'Certificates'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Custom Roles Table
CREATE TABLE public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,  -- Built-in roles cannot be deleted
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Role-Permission Mapping
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

-- Seed default permissions
INSERT INTO public.permissions (code, name, category) VALUES
('applications.view', 'View Applications', 'Applications'),
('applications.manage', 'Manage Applications', 'Applications'),
('applications.assign', 'Assign Officers', 'Applications'),
('certificates.view', 'View Certificates', 'Certificates'),
('certificates.issue', 'Issue Certificates', 'Certificates'),
('certificates.revoke', 'Revoke Certificates', 'Certificates'),
('inspections.view', 'View Inspections', 'Inspections'),
('inspections.schedule', 'Schedule Inspections', 'Inspections'),
('inspections.manage', 'Manage Inspections', 'Inspections'),
('inspectors.view', 'View Inspectors', 'Inspectors'),
('inspectors.manage', 'Manage Inspectors', 'Inspectors'),
('enforcement.view', 'View Enforcement', 'Enforcement'),
('enforcement.manage', 'Manage NCNs', 'Enforcement'),
('support.view', 'View Support Tickets', 'Support'),
('support.respond', 'Respond to Tickets', 'Support'),
('support.manage', 'Manage All Support', 'Support'),
('audit_logs.view', 'View Audit Logs', 'System'),
('users.view', 'View Users', 'System'),
('users.manage', 'Manage Users', 'System'),
('roles.manage', 'Manage Roles', 'System'),
('settings.manage', 'Manage Settings', 'System');

-- Seed default roles and map to permissions
INSERT INTO public.admin_roles (name, display_name, description, is_system_role) VALUES
('super_admin', 'Super Administrator', 'Full system access', true),
('certification_officer', 'Certification Officer', 'Manages applications and certificates', true),
('finance_officer', 'Finance Officer', 'View-only access to applications and certificates', true),
('it_system_auditor', 'IT System Auditor', 'Audit and compliance access', true),
('support_agent', 'Support Agent', 'Handle support tickets and chats', true);
```

### Roles & Permissions UI

```text
+-----------------------------------------------------------------------+
| ROLES & PERMISSIONS                                    [+ Create Role]|
+-----------------------------------------------------------------------+
|                                                                        |
| ROLES                                                                  |
+-----------------------------------------------------------------------+
| Role                    | Users | Permissions | System | Actions      |
+-----------------------------------------------------------------------+
| Super Administrator     | 2     | 21/21       | Yes    | [Edit]       |
| Certification Officer   | 5     | 12/21       | Yes    | [Edit]       |
| Finance Officer         | 3     | 5/21        | Yes    | [Edit]       |
| IT System Auditor       | 1     | 8/21        | Yes    | [Edit]       |
| Support Agent           | 4     | 4/21        | Yes    | [Edit]       |
| Custom Inspector Lead   | 2     | 6/21        | No     | [Edit] [Del] |
+-----------------------------------------------------------------------+
```

### Role Editor

```text
+-----------------------------------------------------------------------+
| EDIT ROLE: Certification Officer                                       |
+-----------------------------------------------------------------------+
|                                                                        |
| Name: [Certification Officer        ]                                  |
| Description: [Manages applications and certificates              ]     |
|                                                                        |
+-----------------------------------------------------------------------+
| PERMISSIONS                                                            |
|                                                                        |
| APPLICATIONS                          | CERTIFICATES                   |
| [x] View Applications                 | [x] View Certificates          |
| [x] Manage Applications               | [x] Issue Certificates         |
| [x] Assign Officers                   | [ ] Revoke Certificates        |
|                                       |                                |
| INSPECTIONS                           | SUPPORT                        |
| [x] View Inspections                  | [ ] View Support Tickets       |
| [x] Schedule Inspections              | [ ] Respond to Tickets         |
| [x] Manage Inspections                | [ ] Manage All Support         |
|                                       |                                |
| ENFORCEMENT                           | SYSTEM                         |
| [x] View Enforcement                  | [ ] View Audit Logs            |
| [x] Manage NCNs                       | [ ] View Users                 |
|                                       | [ ] Manage Users               |
|                                       | [ ] Manage Roles               |
|                                       | [ ] Manage Settings            |
|                                                                        |
| [Save Changes] [Cancel]                                                |
+-----------------------------------------------------------------------+
```

### Enhanced User Management

```text
+-----------------------------------------------------------------------+
| USER MANAGEMENT                                        [+ Add User]   |
+-----------------------------------------------------------------------+
|                                                                        |
| [Search...] [Role ▼] [Status ▼]                                       |
|                                                                        |
+-----------------------------------------------------------------------+
| User                    | Email              | Role(s)     | Assigned |
+-----------------------------------------------------------------------+
| John Smith              | john@ahi.org       | Super Admin | 15 Jan   |
| Sarah Johnson           | sarah@ahi.org      | Cert Officer| 20 Jan   |
|                         |                    | Support     |          |
| Mike Brown              | mike@ahi.org       | Finance     | 22 Jan   |
+-----------------------------------------------------------------------+
```

---

## File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/admin/pages/AdminSupportCenter.tsx` | Support dashboard |
| `src/admin/pages/AdminSupportTickets.tsx` | Ticket list with filters |
| `src/admin/pages/AdminSupportTicketDetail.tsx` | Ticket detail & reply |
| `src/admin/pages/AdminSupportChats.tsx` | Active chat sessions |
| `src/admin/pages/AdminSupportChatSession.tsx` | Individual chat window |
| `src/admin/pages/RolesPermissions.tsx` | Roles management |
| `src/admin/pages/RoleEditor.tsx` | Create/edit role |
| `src/admin/components/ActivityFeed.tsx` | Real-time activity feed |
| `src/admin/components/SupportQueue.tsx` | Support queue widget |
| `src/admin/lib/dynamicPermissions.ts` | Dynamic permission fetching |

### Files to Update

| File | Changes |
|------|---------|
| `src/admin/components/layout/AdminSidebar.tsx` | Add Support Center, Roles menu items |
| `src/admin/pages/AdminDashboard.tsx` | Add activity feed, support queue |
| `src/admin/pages/UserManagement.tsx` | Support multiple roles per user |
| `src/admin/lib/permissions.ts` | Integrate dynamic permission system |
| `src/admin/hooks/useAdminAuth.ts` | Fetch permissions from database |
| `src/App.tsx` | Add new admin routes |

---

## Database Migration

```sql
-- 1. Permissions table
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view permissions" ON public.permissions
FOR SELECT TO authenticated
USING (is_admin_user(auth.uid()));

-- 2. Admin roles table (separate from user_roles assignment)
CREATE TABLE public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view roles" ON public.admin_roles
FOR SELECT TO authenticated
USING (is_admin_user(auth.uid()));

CREATE POLICY "Super admins can manage roles" ON public.admin_roles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- 3. Role-Permission mapping
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view role permissions" ON public.role_permissions
FOR SELECT TO authenticated
USING (is_admin_user(auth.uid()));

CREATE POLICY "Super admins can manage role permissions" ON public.role_permissions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- Seed permissions
INSERT INTO public.permissions (code, name, category) VALUES
('applications.view', 'View Applications', 'Applications'),
('applications.manage', 'Manage Applications', 'Applications'),
('applications.assign', 'Assign Officers', 'Applications'),
('certificates.view', 'View Certificates', 'Certificates'),
('certificates.issue', 'Issue Certificates', 'Certificates'),
('certificates.revoke', 'Revoke Certificates', 'Certificates'),
('inspections.view', 'View Inspections', 'Inspections'),
('inspections.schedule', 'Schedule Inspections', 'Inspections'),
('inspections.manage', 'Manage Inspections', 'Inspections'),
('inspectors.view', 'View Inspectors', 'Inspectors'),
('inspectors.manage', 'Manage Inspectors', 'Inspectors'),
('enforcement.view', 'View Enforcement', 'Enforcement'),
('enforcement.manage', 'Manage NCNs', 'Enforcement'),
('support.view', 'View Support', 'Support'),
('support.respond', 'Respond to Support', 'Support'),
('support.manage', 'Manage Support', 'Support'),
('audit_logs.view', 'View Audit Logs', 'System'),
('users.view', 'View Users', 'System'),
('users.manage', 'Manage Users', 'System'),
('roles.manage', 'Manage Roles', 'System'),
('settings.manage', 'Manage Settings', 'System');

-- Seed system roles
INSERT INTO public.admin_roles (name, display_name, description, is_system_role) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', true),
('certification_officer', 'Certification Officer', 'Manages applications, inspections, and certificates', true),
('finance_officer', 'Finance Officer', 'View-only access to applications and certificates', true),
('it_system_auditor', 'IT System Auditor', 'Audit logs and read-only compliance access', true),
('support_agent', 'Support Agent', 'Handles support tickets and live chats', true);

-- Map roles to permissions (super_admin gets all)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r, permissions p
WHERE r.name = 'super_admin';

-- Add Support-related permissions for new sidebar items
UPDATE public.permissions SET category = 'Support' WHERE code LIKE 'support.%';
```

---

## Sidebar Updates

Add new navigation items:
- **Support Center** (after Enforcement, before Audit Logs)
- **Roles & Permissions** (in Settings section or replace User Management header)

---

## Testing Checklist

After implementation, verify:

1. **Dashboard Activity Feed**
   - Shows recent applications, document uploads, tickets
   - Real-time updates when new activities occur
   - Links navigate to correct detail pages

2. **Support Center**
   - View all tickets with filtering
   - Reply to tickets as support staff
   - Change ticket status (open -> in_progress -> resolved -> closed)
   - Join active chat sessions
   - Send messages in real-time
   - See client info during chat

3. **RBAC System**
   - View all roles and their permission counts
   - Edit role permissions (checkbox grid)
   - Create custom roles
   - Delete non-system roles
   - Assign multiple roles to users
   - Users only see sidebar items they have permission for
   - Permission checks work on API calls

4. **Client Portal Integration**
   - All client activities visible in admin
   - Status changes from admin reflect in client portal
   - Support responses visible to clients

