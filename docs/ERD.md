# Entity Relationship Diagram (ERD)

## 1. Visual Entity Relationship

```
┌──────────────────────────────────────┐
│              retailers               │
├──────────────────────────────────────┤
│ id (PK, SERIAL)                      │
│ business_name (TEXT NOT NULL)        │
│ phone (TEXT NOT NULL)                │
│ address (TEXT NOT NULL)              │
│ created_at (TIMESTAMP DEFAULT NOW()) │
└──────────────────┬───────────────────┘
                   │
                   │ 1:N
                   ▼
┌──────────────────────────────────────┐        ┌────────────────────────────────────────────────────────┐
│                users                 │        │                   delivery_requests                    │
├──────────────────────────────────────┤        ├────────────────────────────────────────────────────────┤
│ id (PK, SERIAL)                      │◄───────┤ id (PK, SERIAL)                                        │
│ retailer_id (FK -> retailers.id)     │  (FK)  │ retailer_id (FK -> retailers.id)                       │
│ name (TEXT NOT NULL)                 │        │ created_by (FK -> users.id)                            │
│ phone (TEXT NOT NULL)                │        │ customer_name (TEXT NOT NULL)                          │
│ role (TEXT CHECK: staff/disp/rider)  │        │ customer_phone (TEXT NOT NULL)                         │
│ created_at (TIMESTAMP DEFAULT NOW()) │        │ address (TEXT NOT NULL)                                │
└──────────────────┬───────────────────┘        │ item_description (TEXT NOT NULL)                       │
                   │                            │ status (TEXT CHECK: Requested/Assigned/Picked/Deliv)   │
                   │                            │ assigned_rider_id (FK -> users.id, NULLABLE)           │
                   │                            │ confirmation_code (TEXT, NULLABLE)                     │
                   │                            │ created_at (TIMESTAMP DEFAULT NOW())                   │
                   │                            │ updated_at (TIMESTAMP DEFAULT NOW())                   │
                   │                            └───────────────────────────┬────────────────────────────┘
                   │                                                        │
                   │                                                        │ 1:N
                   │                                                        ▼
                   │                                    ┌────────────────────────────────────────────────┐
                   │                                    │                 status_events                  │
                   │                                    ├────────────────────────────────────────────────┤
                   │                                    │ id (PK, SERIAL)                                │
                   │                                    │ delivery_request_id (FK -> deliv_requests.id)  │
                   └───────────────────────────────────►│ status (TEXT NOT NULL)                         │
                               (changed_by FK)          │ changed_by (FK -> users.id)                    │
                                                        │ changed_at (TIMESTAMP DEFAULT NOW())           │
                                                        └────────────────────────────────────────────────┘
```

---

## 2. Table Specifications & Schema Definitions

### `retailers` (Migration 001)

Represents independent merchant / shop accounts using Reflex in Kenya (e.g. Mama Mboga stalls, pharmacy distributors, electronic shops in Nairobi).

| Column          | Type        | Constraints     | Description                                   |
| :-------------- | :---------- | :-------------- | :-------------------------------------------- |
| `id`            | `SERIAL`    | `PRIMARY KEY`   | Unique retailer identifier                    |
| `business_name` | `TEXT`      | `NOT NULL`      | Registered trading name of retailer           |
| `phone`         | `TEXT`      | `NOT NULL`      | Contact phone number (e.g., Safaricom/Airtel) |
| `address`       | `TEXT`      | `NOT NULL`      | Physical premises / pickup hub location       |
| `created_at`    | `TIMESTAMP` | `DEFAULT NOW()` | Registration timestamp                        |

---

### `users` (Migration 002)

Represents actors interacting with the system across three distinct roles: `retailer_staff`, `dispatcher`, and `rider`.

| Column        | Type        | Constraints                                                          | Description                           |
| :------------ | :---------- | :------------------------------------------------------------------- | :------------------------------------ |
| `id`          | `SERIAL`    | `PRIMARY KEY`                                                        | Unique user identifier                |
| `retailer_id` | `INTEGER`   | `NOT NULL REFERENCES retailers(id) ON DELETE CASCADE`                | Associated merchant tenant            |
| `name`        | `TEXT`      | `NOT NULL`                                                           | Full name of actor                    |
| `phone`       | `TEXT`      | `NOT NULL`                                                           | Contact number for coordination / SMS |
| `role`        | `TEXT`      | `NOT NULL CHECK (role IN ('retailer_staff', 'dispatcher', 'rider'))` | System access role                    |
| `created_at`  | `TIMESTAMP` | `DEFAULT NOW()`                                                      | Record creation timestamp             |

**Indexes (Migration 005):**

- `idx_users_retailer_id` on `users(retailer_id)` - Accelerates multi-tenant user filtering.
- `idx_users_role` on `users(role)` - Speeds up dispatcher queries fetching active riders.

---

### `delivery_requests` (Migration 003)

The central operational aggregate. Governs the delivery lifecycle through a strict backend state machine.

| Column              | Type        | Constraints                                                                                          | Description                                        |
| :------------------ | :---------- | :--------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| `id`                | `SERIAL`    | `PRIMARY KEY`                                                                                        | Unique delivery request ID                         |
| `retailer_id`       | `INTEGER`   | `NOT NULL REFERENCES retailers(id) ON DELETE CASCADE`                                                | Tenant owner of delivery                           |
| `created_by`        | `INTEGER`   | `NOT NULL REFERENCES users(id) ON DELETE RESTRICT`                                                   | Staff member who initiated request                 |
| `customer_name`     | `TEXT`      | `NOT NULL`                                                                                           | Recipient customer name                            |
| `customer_phone`    | `TEXT`      | `NOT NULL`                                                                                           | Recipient phone number                             |
| `address`           | `TEXT`      | `NOT NULL`                                                                                           | Drop-off destination address                       |
| `item_description`  | `TEXT`      | `NOT NULL`                                                                                           | Package description & special handling             |
| `status`            | `TEXT`      | `NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Assigned', 'Picked Up', 'Delivered'))` | Current lifecycle state                            |
| `assigned_rider_id` | `INTEGER`   | `NULLABLE REFERENCES users(id) ON DELETE SET NULL`                                                   | Rider currently assigned                           |
| `confirmation_code` | `TEXT`      | `NULLABLE`                                                                                           | Generated 6-digit confirmation token (`RX-XXXXXX`) |
| `created_at`        | `TIMESTAMP` | `DEFAULT NOW()`                                                                                      | Request creation timestamp                         |
| `updated_at`        | `TIMESTAMP` | `DEFAULT NOW()`                                                                                      | Last status transition timestamp                   |

**Indexes (Migration 005):**

- `idx_delivery_requests_status` on `delivery_requests(status)` - Optimizes polling for unassigned requests (`WHERE status = 'Requested'`).
- `idx_delivery_requests_retailer_id` on `delivery_requests(retailer_id)` - Scopes retailer portal queries.
- `idx_delivery_requests_assigned_rider_id` on `delivery_requests(assigned_rider_id)` - Accelerates rider dashboard polling.

---

### `status_events` (Migration 004)

Immutable, append-only event ledger capturing every state change with actor identity and timestamp for auditable proof of delivery.

| Column                | Type        | Constraints                                                   | Description                                                       |
| :-------------------- | :---------- | :------------------------------------------------------------ | :---------------------------------------------------------------- |
| `id`                  | `SERIAL`    | `PRIMARY KEY`                                                 | Unique event audit ID                                             |
| `delivery_request_id` | `INTEGER`   | `NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE` | Target delivery request                                           |
| `status`              | `TEXT`      | `NOT NULL`                                                    | State entered (`Requested`, `Assigned`, `Picked Up`, `Delivered`) |
| `changed_by`          | `INTEGER`   | `NOT NULL REFERENCES users(id) ON DELETE RESTRICT`            | Actor executing transition                                        |
| `changed_at`          | `TIMESTAMP` | `DEFAULT NOW()`                                               | Immutable event timestamp                                         |

**Indexes (Migration 005):**

- `idx_status_events_delivery_request_id` on `status_events(delivery_request_id)` - Speeds up history retrieval and timeline rendering.

---

## 3. Relational Integrity & Multi-Tenancy Rules

1. **Multi-Tenant Isolation:** `retailer_id` scopes merchant data. Requests and staff are tied to the tenant entity.
2. **Audit Preservation:** `changed_by` references `users(id)` with `RESTRICT` on delete, ensuring the audit trail cannot be invalidated by deleting a user.
3. **Atomic State & Event Synchronization:** Every update to `delivery_requests.status` is committed within a single database transaction alongside its corresponding `status_events` insert.
4. **Optimistic Concurrency Control:** Rider assignment uses atomic conditional `UPDATE delivery_requests SET status = 'Assigned', assigned_rider_id = $1 WHERE id = $2 AND status = 'Requested' RETURNING *` to eliminate race conditions between multiple dispatchers.
