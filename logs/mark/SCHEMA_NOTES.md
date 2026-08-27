# Mark's Schema Design Notes

## Schema Overview

Built 4 tables + 2 ENUMs to support the Reflex delivery tracking system.

### Tables

1. **retailers** — Business accounts using the system. Multi-tenant foundation.
2. **users** — People (staff, dispatchers, riders) with role-based access
3. **delivery_requests** — Core domain object; the delivery lifecycle
4. **delivery_status_history** — Immutable audit trail; proof of delivery

### ENUMs

- `user_role`: RETAILER_STAFF, DISPATCHER, RIDER
- `delivery_status`: REQUESTED, ASSIGNED, PICKED_UP, DELIVERED

## Key Design Decisions

1. **Multi-tenant:** Each retailer is independent (no cross-retailer visibility)
2. **Immutable history:** Status history is append-only, source of truth
3. **Denormalized status:** Current status on request for read speed
4. **Simple confirmation:** Text code, not external QR service

## Indexes Created

| Table | Index | Purpose |
|-------|-------|---------|
| retailers | idx_retailers_business_name | Quick shop lookups |
| users | idx_users_role | Filter by user type |
| users | idx_users_retailer_id | Find staff/riders by retailer |
| delivery_requests | idx_delivery_requests_status | Dispatcher dashboard (pending/assigned) |
| delivery_requests | idx_delivery_requests_assigned_rider | Rider's deliveries |
| delivery_requests | idx_delivery_requests_retailer | Retailer's requests |
| delivery_status_history | idx_delivery_status_history_request | Timeline of a delivery |

## Constraints

- **Referential integrity:** FKs prevent orphaned records
- **Cascading deletes:** Deleting a retailer deletes its users and requests (intended)
- **RESTRICT on audit:** Deleting a user fails if they appear in status history (audit trail preserved)

## What Works

- ✅ Supports multi-retailer isolation
- ✅ Tracks full delivery lifecycle
- ✅ Immutable audit trail for proof
- ✅ Indexes optimized for common queries
- ✅ Role-based data model (ready for middleware enforcement)

## What's Simplified

- ✅ No complex permissions in DB (app enforces)
- ✅ No geolocation tracking (status updates only)
- ✅ No real-time infrastructure (polling model)
- ✅ Confirmation code is text, not QR (easy MVP)