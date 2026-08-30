# Mark's Schema Design Notes

## Schema Overview

Built 4 relational tables with strict check constraints and targeted performance indexes to support the Reflex delivery tracking system.

### Tables

1. **`retailers`** (Migration `001_create_retailers.sql`) - Merchant accounts using the system; foundational tenant boundary.
2. **`users`** (Migration `002_create_users.sql`) - System actors (`retailer_staff`, `dispatcher`, `rider`) tied to a retailer tenant.
3. **`delivery_requests`** (Migration `003_create_delivery_requests.sql`) - Core domain entity governing delivery lifecycle (`Requested` → `Assigned` → `Picked Up` → `Delivered`). Includes `created_by`, `assigned_rider_id`, and `confirmation_code`.
4. **`status_events`** (Migration `004_create_status_events.sql`) - Immutable audit trail capturing every state change with `changed_by` and `changed_at` timestamps for non-repudiation proof of delivery.

### Role & Status Constraints

- `users.role`: CHECK constraint `('retailer_staff', 'dispatcher', 'rider')`
- `delivery_requests.status`: CHECK constraint `('Requested', 'Assigned', 'Picked Up', 'Delivered')`

## Key Design Decisions

1. **Multi-tenant Foundation:** Every request and staff member is scoped by `retailer_id`.
2. **Immutable Audit Ledger:** `status_events` is append-only. History is never updated or deleted in place.
3. **Denormalized Fast Reads:** Current status resides on `delivery_requests` for single-query dashboards, while `status_events` maintains complete provenance.
4. **Atomic Concurrency Protection:** State updates and audit event logging occur inside single atomic database transactions (`async with DatabaseConnection.transaction() as conn:`).
5. **Confirmation Code Tokenization:** 6-digit verification code (`RX-XXXXXX`) generated at pickup and verified at dropoff.

## Indexes Created (Migration `005_add_indexes.sql`)

| Table               | Index Name                                | Indexed Column        | Purpose                                                     |
| :------------------ | :---------------------------------------- | :-------------------- | :---------------------------------------------------------- |
| `delivery_requests` | `idx_delivery_requests_status`            | `status`              | Dispatcher dashboard polling (`WHERE status = 'Requested'`) |
| `delivery_requests` | `idx_delivery_requests_retailer_id`       | `retailer_id`         | Retailer portal multi-tenant scoping                        |
| `delivery_requests` | `idx_delivery_requests_assigned_rider_id` | `assigned_rider_id`   | Rider dashboard polling (`WHERE assigned_rider_id = $1`)    |
| `status_events`     | `idx_status_events_delivery_request_id`   | `delivery_request_id` | Delivery timeline & audit history lookups                   |
| `users`             | `idx_users_retailer_id`                   | `retailer_id`         | Tenant user filtering                                       |
| `users`             | `idx_users_role`                          | `role`                | Dispatcher rider selection drop-down                        |

## Constraints & Referential Integrity

- **Foreign Key Constraints:**
  - `users.retailer_id` → `retailers(id)`
  - `delivery_requests.retailer_id` → `retailers(id)`
  - `delivery_requests.created_by` → `users(id)`
  - `delivery_requests.assigned_rider_id` → `users(id)`
  - `status_events.delivery_request_id` → `delivery_requests(id)`
  - `status_events.changed_by` → `users(id)`
- **Referential Protection:** `ON DELETE RESTRICT` on audit foreign keys ensures audit integrity cannot be destroyed.

## What Works

- Full multi-tenant data isolation
- Complete lifecycle tracking with non-repudiation audit trail
- Production index coverage for high-frequency polling filters
- Zero ORM overhead with raw SQL queries and asyncpg pooling
