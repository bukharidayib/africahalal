## Plan

I will replace the current partial delete logic with a deeper, transaction-safe business deletion flow that removes records connected by both `business_id` and the business `organization_id`.

### What will be deleted when an admin deletes a business

- The business row from `client_businesses`.
- Related certification applications and their children:
  - application documents
  - application messages and read markers
  - application products and product ingredients
  - status history
  - approval requests
  - certification decisions
  - inspections, checklist items, evidence, notifications, inspection reports
  - NCNs and corrective actions
- Related billing records:
  - quotations
  - subscriptions
  - invoices
  - invoice items
  - payment transactions
  - invoice activity logs
  - certificate history and certificates
  - accountant audit log entries tied to the business organization, invoices, or quotations
- Related Ingredient Tracker records:
  - supervisor ingredient collections
  - supervisor collected ingredients
- Related Enforcement records:
  - non-conformance notices
  - corrective actions
  - supervisor NCRs
- Related Reports & Incidents records:
  - inspector reports and checklist items
  - inspector incidents
  - inspector observations
  - inspector conflicts
  - supervisor sites
  - supervisor reports and checklist items
  - supervisor compliance scores
  - supervisor observations
  - supervisor incidents
- Related supervisor organization records:
  - supervisor invitations
  - organization supervisor assignments

### Technical approach

1. **Add a database-level delete function**
   - Create a `public.admin_delete_business_deep(_business_id uuid)` function.
   - It will run as one database transaction, so if any delete fails, the whole operation rolls back instead of leaving partial data behind.
   - It will collect all dependent IDs first, then delete from child tables before parent tables to avoid foreign-key errors.
   - It will return deletion counts so the Edge Function can confirm what was removed.

2. **Update `delete-business` Edge Function**
   - Keep the existing admin authentication check.
   - Replace the current manual partial deletion code with a call to the new database function.
   - Stop silently ignoring delete errors; any failure will return a clear error message.

3. **Keep user accounts and organization records safe**
   - I will not delete the owner profile, auth user, or the base `organizations` row unless the database requires it.
   - The goal is to remove the business and all operational records that make it appear in admin modules.

4. **Verify coverage**
   - Re-check foreign-key relationships after the change.
   - Confirm the delete function includes the tables powering Ingredient Tracker, Enforcement, Reports, Incidents, Billing, Applications, Inspections, Certificates, and Quotations.
   - Deploy the updated Edge Function after the migration is accepted.