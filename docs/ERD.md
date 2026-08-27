# Entity Relationship Diagram (ERD)

## Visual Representation
┌─────────────────────┐
│     RETAILERS       │
│─────────────────────│
│ id (PK)             │
│ business_name       │
│ phone               │
│ address             │
│ created_at          │
│ updated_at          │
└─────────┬───────────┘
          │
          │ (1:many)
          │
┌─────────▼───────────┐         ┌────────────────────────┐
│       USERS         │         │ DELIVERY_REQUESTS      │
│─────────────────────│         │────────────────────────│
│ id (PK)             │◄────────│ id (PK)                │
│ name                │ (FK)    │ retailer_id (FK)       │
│ phone               │         │ customer_name          │
│ role (ENUM)         │         │ customer_phone         │
│ retailer_id (FK)    │         │ address                │
│ created_at          │         │ item_description       │
│ updated_at          │         │ status (ENUM)          │
└────────┬────────────┘         │ assigned_rider_id (FK) │
         │                       │ confirmation_code      │
         │ (1:many)             │ creator_id (FK)        │
         │                       │ created_at             │
         │                       │ updated_at             │
         │                       └────────┬───────────────┘
         │                                │
         │                                │ (1:many)
         │                                │
         │                       ┌────────▼──────────────────┐
         └──────────────────────►│DELIVERY_STATUS_HISTORY    │
              (changed_by FK)    │───────────────────────────│
                                 │ id (PK)                   │
                                 │ delivery_request_id (FK)  │
                                 │ status (ENUM)             │
                                 │ changed_by_id (FK)        │
                                 │ timestamp                 │
                                 │ notes                     │
                                 └───────────────────────────┘

## Table Descriptions

### `retailers`
Represents a business account using the Reflex system. Each retailer is independent with their own delivery requests.

**Indexes:** `idx_retailers_business_name`

---

### `users`
Represents people in the system with three roles:
- **RETAILER_STAFF:** Can create delivery requests
- **DISPATCHER:** Can view all requests and assign riders
- **RIDER:** Can view assigned deliveries and update status

**Foreign Keys:**
- `retailer_id` → `retailers` (staff and riders belong to a retailer)

**Indexes:** `idx_users_role`, `idx_users_retailer_id`

---

### `delivery_requests`
The core domain object. Represents a single delivery from request to completion.

**Fields:**
- `status` (ENUM): REQUESTED, ASSIGNED, PICKED_UP, DELIVERED
- `assigned_rider_id`: The rider currently handling this delivery
- `confirmation_code`: Generated when rider picks up, validated when delivered
- `creator_id`: The retailer staff member who created it

**Foreign Keys:**
- `retailer_id` → `retailers`
- `assigned_rider_id` → `users` (rider)
- `creator_id` → `users` (retailer staff)

**Indexes:** `idx_delivery_requests_status`, `idx_delivery_requests_assigned_rider`, `idx_delivery_requests_retailer`

---

### `delivery_status_history`
An immutable audit trail. Every status change is logged here with WHO changed it and WHEN. This serves as proof of delivery.

**Foreign Keys:**
- `delivery_request_id` → `delivery_requests`
- `changed_by_id` → `users`

**Indexes:** `idx_delivery_status_history_request`

---

## Key Relationships

1. **Retailer → Users:** One retailer can have many staff and riders
2. **Retailer → Delivery Requests:** One retailer creates many delivery requests
3. **Rider → Delivery Requests:** One rider is assigned to many deliveries
4. **Delivery Request → Status History:** One request has many status changes (immutable log)

---

## Design Decisions

- **Multi-tenant:** Each retailer is independent (via `retailer_id` foreign key)
- **Status as ENUM:** Enforces valid states at the database level
- **Immutable history:** Status history never updates, only inserts; this is the source of truth for delivery proof
- **Denormalized current status:** `status` field on `delivery_requests` for fast reads; kept in sync with history by application logic