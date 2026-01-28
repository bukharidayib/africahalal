
## Implementation Plan: Enhanced Client Portal with Products/Ingredients, Documents, Applications Module, and Support Center

This plan addresses the four major feature requests:
1. **Enhanced Product Information Step**: Add ingredient lists to products, remove service references
2. **Mandatory Assets Step**: New application step for required documents upload
3. **My Applications Module**: New client portal module to view all applications with details
4. **Support Center Module**: Complete support system with tickets, FAQ, chat, and contact info

---

## Overview

```text
+-----------------------------------------------------------------+
|                     CLIENT PORTAL NAVIGATION                     |
+-----------------------------------------------------------------+
| Dashboard | Apply Now | My Applications | Documents | Support   |
+-----------------------------------------------------------------+
|                    My Inspections | Certificates                 |
+-----------------------------------------------------------------+
```

---

## 1. Enhanced Product Information (with Ingredients)

### Current State
- Products only have: name, brand, category
- UI mentions "Product/Service List"

### New Design
- Remove all "service" references - focus only on products
- Add ingredient list per product
- Two-step flow: Create Product -> Add Ingredients

```text
+---------------------------------------------------------------+
| PRODUCT INFORMATION                                            |
+---------------------------------------------------------------+
|                                                                |
| Products for Certification                     [+ Add Product] |
|                                                                |
| +-----------------------------------------------------------+ |
| | Halal Beef Sausages                          [Ingredients] | |
| | Brand: AHI Foods | Category: Processed Meats              | |
| | Ingredients: Beef (60%), Salt, Spices, Casing...    [Edit] | |
| +-----------------------------------------------------------+ |
|                                                                |
| +-----------------------------------------------------------+ |
| | Chicken Patties                              [Ingredients] | |
| | Brand: AHI Foods | Category: Processed Meats              | |
| | 3 ingredients added                           [Edit] [Del] | |
| +-----------------------------------------------------------+ |
|                                                                |
+---------------------------------------------------------------+
```

### Data Structure Changes

**New Database Tables Required:**

```sql
-- Products for applications
CREATE TABLE application_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES certification_applications(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ingredients for each product
CREATE TABLE product_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES application_products(id) ON DELETE CASCADE,
    ingredient_name TEXT NOT NULL,
    percentage DECIMAL(5,2),
    source TEXT,
    is_halal_certified BOOLEAN DEFAULT false,
    supplier_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Application Flow Changes

**Step 3: Product Information (Updated)**
1. User clicks "Add Product" -> Modal opens
2. Enter: Product Name, Brand, Category
3. After product is added, "Manage Ingredients" button appears
4. Click to open Ingredients Modal:
   - Add multiple ingredients with: Name, Percentage, Source, Halal Certified checkbox, Supplier
5. Products display with ingredient count badge

---

## 2. Mandatory Assets Step (New Step 4)

### Purpose
Upload required compliance documents before declaration step.

### Required Documents List
- Business Registration Certificate (PACRA)
- TPIN/Tax Clearance Certificate  
- Ingredient Technical Specification Sheet
- Halal Policy Statement
- Process Flow Diagrams (optional)
- Supplier Halal Certificates (optional)

```text
+---------------------------------------------------------------+
| MANDATORY DOCUMENTS                                            |
+---------------------------------------------------------------+
|                                                                |
| Required Documents for Certification                           |
|                                                                |
| * Business Registration (PACRA)                                |
|   [ ] Not Uploaded                             [Upload]        |
|                                                                |
| * TPIN/Tax Clearance                                           |
|   [x] tax_clearance_2026.pdf (2.4 MB)         [Replace]       |
|                                                                |
| * Ingredient Technical Spec Sheet                              |
|   [ ] Not Uploaded                             [Upload]        |
|                                                                |
| Optional Documents                                             |
|                                                                |
| o Process Flow Diagrams                                        |
|   [ ] Not Uploaded                             [Upload]        |
|                                                                |
+---------------------------------------------------------------+
```

### Updated Application Steps

```text
Step 1: Establishment Details (existing)
Step 2: Certification Scope (existing)
Step 3: Product Information with Ingredients (updated)
Step 4: Mandatory Assets (NEW)
Step 5: Declaration & Submit (existing, was step 4)
```

---

## 3. My Applications Module

### New Route
`/client/applications` - List all applications
`/client/applications/:id` - View single application details

### Sidebar Menu Update
Add between "Apply Now" and "My Documents":
```text
- Dashboard
- Apply Now
- My Applications  <-- NEW
- My Documents
- Inspections
- Certificate Vault
```

### Application List View

```text
+---------------------------------------------------------------+
| MY APPLICATIONS                                                |
+---------------------------------------------------------------+
|                                                                |
| [All] [Draft] [Submitted] [In Progress] [Completed]           |
|                                                                |
| +-----------------------------------------------------------+ |
| | APP-1234567890                                             | |
| | Full Certification | Submitted: 27 Jan 2026                | |
| | Status: [Under Review]                          [View ->]  | |
| +-----------------------------------------------------------+ |
|                                                                |
| +-----------------------------------------------------------+ |
| | APP-0987654321                                             | |
| | Annual Renewal | Submitted: 15 Jan 2026                    | |
| | Status: [Awaiting Inspection]                   [View ->]  | |
| +-----------------------------------------------------------+ |
|                                                                |
+---------------------------------------------------------------+
```

### Application Detail View (Client Side)

```text
+---------------------------------------------------------------+
| <- Back to Applications                                        |
|                                                                |
| APP-1234567890                             [Under Review]      |
| Full Certification                                             |
+---------------------------------------------------------------+
|                                                                |
| [Overview] [Products] [Documents] [Timeline]                   |
|                                                                |
+---------------------------------------------------------------+
| OVERVIEW TAB                                                   |
|                                                                |
| Organization: Global Foods Co.                                 |
| Registration: REG-12345                                        |
| Location: Lusaka, Zambia                                       |
|                                                                |
| Scope: Food Processing, Meat & Poultry                        |
| Submitted: 27 Jan 2026                                        |
|                                                                |
+---------------------------------------------------------------+
| PRODUCTS TAB                                                   |
|                                                                |
| 1. Halal Beef Sausages                                        |
|    Brand: AHI Foods | Category: Processed Meats               |
|    Ingredients: Beef (60%), Salt (5%), Spices (10%)...        |
|                                                                |
+---------------------------------------------------------------+
| DOCUMENTS TAB                                                  |
|                                                                |
| - Business Registration.pdf      [View] [Download]            |
| - TPIN Certificate.pdf           [View] [Download]            |
| - Ingredient Specs.xlsx          [View] [Download]            |
|                                                                |
+---------------------------------------------------------------+
| TIMELINE TAB                                                   |
|                                                                |
| [x] 27 Jan - Application Submitted                            |
| [x] 28 Jan - Status: Under Review                             |
| [ ] Awaiting inspection scheduling...                         |
|                                                                |
+---------------------------------------------------------------+
```

---

## 4. Support Center Module

### New Route
`/client/support` - Support center dashboard
`/client/support/tickets` - Ticket list
`/client/support/tickets/new` - Create ticket
`/client/support/tickets/:id` - Ticket detail
`/client/support/faq` - FAQ section
`/client/support/chat` - Live chat

### Sidebar Update
Add after "Certificate Vault":
```text
- Certificate Vault
- Support Center  <-- NEW
```

### Support Center Landing

```text
+---------------------------------------------------------------+
| SUPPORT CENTER                                                 |
+---------------------------------------------------------------+
|                                                                |
| How can we help you today?                                     |
|                                                                |
| +-------------+ +-------------+ +-------------+ +-------------+|
| |   Tickets   | |    FAQ      | | Live Chat   | |  Contact   ||
| |   [icon]    | |   [icon]    | |   [icon]    | |   [icon]   ||
| | Submit/View | | Quick Help  | |Chat Experts | | Email/Phone||
| +-------------+ +-------------+ +-------------+ +-------------+|
|                                                                |
| RECENT TICKETS                                                 |
|                                                                |
| TKT-001 | Document Upload Issue | Open   | 2 hours ago        |
| TKT-002 | Payment Query         | Closed | 3 days ago         |
|                                                                |
+---------------------------------------------------------------+
| CONTACT INFORMATION                                            |
|                                                                |
| Email: support@africanhalaal.com                               |
| Phone: +260 XXX XXX XXX                                        |
+---------------------------------------------------------------+
```

### Database Tables for Support

```sql
-- Support tickets
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Ticket messages (threaded conversation)
CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL, -- 'client' or 'support'
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- FAQ items
CREATE TABLE faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat sessions for realtime chat
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    status TEXT DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);

-- Chat messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Realtime Chat Implementation
- Uses Supabase Realtime subscriptions for live messaging
- Chat widget opens in full-page view in Support Center
- Support agents respond via admin portal

---

## File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/client/MyApplications.tsx` | Applications list page |
| `src/pages/client/ApplicationDetail.tsx` | Single application detail view |
| `src/pages/client/SupportCenter.tsx` | Support center main page |
| `src/pages/client/SupportTickets.tsx` | Ticket list |
| `src/pages/client/SupportTicketDetail.tsx` | Single ticket view |
| `src/pages/client/SupportTicketNew.tsx` | Create new ticket |
| `src/pages/client/SupportFAQ.tsx` | FAQ page |
| `src/pages/client/SupportChat.tsx` | Live chat page |
| `src/components/client/ProductIngredientModal.tsx` | Modal for managing ingredients |
| `src/components/client/MandatoryDocuments.tsx` | Upload required docs component |

### Files to Update

| File | Changes |
|------|---------|
| `src/components/layout/ClientSidebar.tsx` | Add "My Applications" and "Support Center" menu items |
| `src/App.tsx` | Add new routes for applications and support |
| `src/pages/client/CertificationApplication.tsx` | Restructure product step, add ingredients, add mandatory docs step |

---

## Database Migration

```sql
-- 1. Application Products
CREATE TABLE public.application_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES certification_applications(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.application_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own products" ON public.application_products
FOR ALL TO authenticated
USING (
    application_id IN (
        SELECT ca.id FROM certification_applications ca
        JOIN profiles p ON p.organization_id = ca.organization_id
        WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Admins can view products" ON public.application_products
FOR SELECT TO authenticated
USING (is_admin_user(auth.uid()));

-- 2. Product Ingredients
CREATE TABLE public.product_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES application_products(id) ON DELETE CASCADE,
    ingredient_name TEXT NOT NULL,
    percentage DECIMAL(5,2),
    source TEXT,
    is_halal_certified BOOLEAN DEFAULT false,
    supplier_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own ingredients" ON public.product_ingredients
FOR ALL TO authenticated
USING (
    product_id IN (
        SELECT ap.id FROM application_products ap
        JOIN certification_applications ca ON ca.id = ap.application_id
        JOIN profiles p ON p.organization_id = ca.organization_id
        WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Admins can view ingredients" ON public.product_ingredients
FOR SELECT TO authenticated
USING (is_admin_user(auth.uid()));

-- 3. Support Tickets
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.support_tickets
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin_user(auth.uid()));

CREATE POLICY "Users can create tickets" ON public.support_tickets
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update tickets" ON public.support_tickets
FOR UPDATE TO authenticated
USING (is_admin_user(auth.uid()));

-- 4. Ticket Messages
CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ticket messages" ON public.ticket_messages
FOR SELECT TO authenticated
USING (
    ticket_id IN (
        SELECT id FROM support_tickets
        WHERE user_id = auth.uid() OR is_admin_user(auth.uid())
    )
);

CREATE POLICY "Users can send messages" ON public.ticket_messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

-- 5. FAQ Items
CREATE TABLE public.faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active FAQs" ON public.faq_items
FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage FAQs" ON public.faq_items
FOR ALL TO authenticated
USING (is_admin_user(auth.uid()));

-- 6. Chat Sessions
CREATE TABLE public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    status TEXT DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.chat_sessions
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin_user(auth.uid()));

CREATE POLICY "Users can create sessions" ON public.chat_sessions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 7. Chat Messages
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chat messages" ON public.chat_messages
FOR SELECT TO authenticated
USING (
    session_id IN (
        SELECT id FROM chat_sessions
        WHERE user_id = auth.uid() OR is_admin_user(auth.uid())
    )
);

CREATE POLICY "Users can send chat messages" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'TKT-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
```

---

## Testing Checklist

After implementation:

1. **Product/Ingredients Flow**
   - Create product -> add ingredients -> view summary
   - Edit/delete ingredients
   - Validate minimum 1 product with ingredients before proceeding

2. **Mandatory Documents Step**
   - Upload required documents
   - Replace existing uploads
   - Cannot proceed without mandatory docs

3. **My Applications Module**
   - View all applications filtered by status
   - Click to view full application details
   - See products, ingredients, documents, timeline

4. **Support Center**
   - Create support ticket
   - View ticket list and details
   - Send/receive messages in ticket
   - Browse FAQ
   - Real-time chat functionality
   - Contact information displayed correctly

