

# Admin Payment Transaction Tracker

## What We're Building

A new "Payment Transactions" tab/section in the Admin Billing page that shows all payment transactions with their ZynlePay response codes and descriptions, allowing admins to track payment issues and successful transactions.

## ZynlePay Response Code Reference

The following codes and descriptions will be displayed:

| Code | Description |
|------|-------------|
| 100 | Transaction successful |
| 120 | Transaction initiated |
| 990 | Transaction pending |
| 995 | Transaction failed |
| 9901 | Merchant not found |
| 9902 | Requesting Device IP is not whitelisted |
| 9903 | Invalid Merchant API credentials or setup not complete |
| 9904 | Merchant Account setup not complete |
| 9905 | Invalid sender ID (mobile number) |
| 9906 | Duplicate reference number detected |
| 9907 | Mobile Number blacklisted |
| 9908 | Merchant commission setup not complete |
| 9909 | Merchant payment provider setup not complete |
| 9910 | Merchant setup not complete |
| 9911 | Merchant insufficient balance |
| 9912 | Request amount exceeds disbursement limit |
| 9913 | Invalid or wrong bank name provided |
| 9914 | Cannot determine transaction status now, please try again later |

## Implementation

### 1. Update `src/admin/pages/AdminBilling.tsx`

Add a Tabs component to split the page into two tabs:
- **Invoices** — existing invoice management (unchanged)
- **Payment Transactions** — new table showing all `payment_transactions` records

The Payment Transactions tab will:
- Fetch from `payment_transactions` table joined with `invoices(invoice_number)` and profiles/organizations for payer info
- Display columns: Transaction Ref, Invoice #, Amount, Payment Method, Status, Response Code, Description (mapped from code), Date
- Color-code response codes: green for 100, yellow for 120/990, red for 995+
- Include search and status filter
- Show a "Check Status" button for pending transactions that calls the `check-payment-status` edge function
- Parse `gateway_response` JSON to extract the response code

### 2. Response Code Mapping

Create a helper map in the component that maps each code string to its human-readable description and a color badge variant.

## Files Changed

| Action | File |
|--------|------|
| Edit | `src/admin/pages/AdminBilling.tsx` — add Tabs with Payment Transactions section |

