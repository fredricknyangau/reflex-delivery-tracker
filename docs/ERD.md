# Reflex - Entity Relationship Diagram

## Week 3 - The Readiness Sprint

**Status:** Draft, derived from `PROBLEM_AND_DESIGN.md` Part 2; ready for Mark to confirm/refine
**Owner:** Mark

---

## 1. Entities Overview

Four tables, directly mapping to the four domain classes identified in the OOD analysis:

| Table               | Maps To           | Purpose                                                   |
| ------------------- | ----------------- | --------------------------------------------------------- |
| `retailers`         | `Retailer`        | A business account using the platform                     |
| `users`             | `User`            | Any person acting as retailer staff, dispatcher, or rider |
| `delivery_requests` | `DeliveryRequest` | The central object, one row per delivery, start to finish |
| `status_events`     | `StatusEvent`     | Immutable log of every status change, the audit trail     |

`Confirmation` from the design doc is **not** a separate table, it's implemented as a `confirmation_code` column directly on `delivery_requests`, since it has no independent lifecycle of its own, it's generated once and validated once, folding it into its own table would be unnecessary indirection for this scope.

---

## 2. Entity Definitions

### `retailers`

| Column        | Type      | Constraints   |
| ------------- | --------- | ------------- |
| id            | SERIAL    | PRIMARY KEY   |
| business_name | TEXT      | NOT NULL      |
| phone         | TEXT      | NOT NULL      |
| address       | TEXT      | NOT NULL      |
| created_at    | TIMESTAMP | DEFAULT NOW() |

---

### `users`

| Column      | Type      | Constraints                                                                                                                            |
| ----------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| id          | SERIAL    | PRIMARY KEY                                                                                                                            |
| retailer_id | INTEGER   | REFERENCES retailers(id), NULLABLE (dispatchers/riders may not belong to one specific retailer, depending on Part 3's confirmed model) |
| name        | TEXT      | NOT NULL                                                                                                                               |
| phone       | TEXT      | NOT NULL                                                                                                                               |
| role        | TEXT      | NOT NULL, CHECK (role IN ('retailer_staff', 'dispatcher', 'rider'))                                                                    |
| created_at  | TIMESTAMP | DEFAULT NOW()                                                                                                                          |

**Note:** per Part 3's decision (dispatcher scope = per-retailer for this sprint), `retailer_id` should likely be NOT NULL for all three roles in the simplified model, confirm this with the team, since "per-retailer dispatcher" implies a dispatcher _does_ belong to exactly one retailer, not floating free.

---

### `delivery_requests`

| Column            | Type      | Constraints                                                                                          |
| ----------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| id                | SERIAL    | PRIMARY KEY                                                                                          |
| retailer_id       | INTEGER   | REFERENCES retailers(id), NOT NULL                                                                   |
| created_by        | INTEGER   | REFERENCES users(id), NOT NULL - the retailer staff member who logged it                             |
| customer_name     | TEXT      | NOT NULL                                                                                             |
| customer_phone    | TEXT      | NOT NULL                                                                                             |
| address           | TEXT      | NOT NULL                                                                                             |
| item_description  | TEXT      | NOT NULL                                                                                             |
| status            | TEXT      | NOT NULL, DEFAULT 'Requested', CHECK (status IN ('Requested', 'Assigned', 'Picked Up', 'Delivered')) |
| assigned_rider_id | INTEGER   | REFERENCES users(id), NULLABLE (null until assigned)                                                 |
| confirmation_code | TEXT      | NULLABLE (generated when status becomes 'Picked Up')                                                 |
| created_at        | TIMESTAMP | DEFAULT NOW()                                                                                        |
| updated_at        | TIMESTAMP | DEFAULT NOW()                                                                                        |

**Second safety net (per the architecture doc's failure-boundary discipline):** the CHECK constraint above enforces valid _values_ at the database level, but not valid _transitions_ (e.g., it won't stop `Delivered → Requested` by itself). Transition validity is enforced in the service layer per `ARCHITECTURE.md` Section 3, the CHECK constraint here is a defense against invalid data getting in at all, not a substitute for the state machine logic.

---

### `status_events`

| Column              | Type      | Constraints                                |
| ------------------- | --------- | ------------------------------------------ |
| id                  | SERIAL    | PRIMARY KEY                                |
| delivery_request_id | INTEGER   | REFERENCES delivery_requests(id), NOT NULL |
| status              | TEXT      | NOT NULL                                   |
| changed_by          | INTEGER   | REFERENCES users(id), NOT NULL             |
| changed_at          | TIMESTAMP | DEFAULT NOW()                              |

This table is intentionally append-only, no UPDATE or DELETE operations are expected against it, it exists purely as the permanent record backing "status visibility" and "proof of delivery" from the original problem statement.

---

## 3. Relationship Diagram

```
retailers
    │ 1
    │
    │ many
    ▼
  users ──────────────────┐
    │ 1 (as rider)          │ 1 (as retailer_staff, created_by)
    │                       │
    │ many                  │ many
    ▼                       ▼
delivery_requests ◀─────────┘
    │ 1
    │
    │ many
    ▼
status_events
```

**Cardinality summary:**

- One `retailer` has many `users` and many `delivery_requests`
- One `user` (rider) can be assigned many `delivery_requests`
- One `user` (retailer_staff) can create many `delivery_requests`
- One `delivery_request` has many `status_events`

---

## 4. Migration File Mapping

| File                               | Creates                                                   |
| ---------------------------------- | --------------------------------------------------------- |
| `001_create_retailers.sql`         | `retailers`                                               |
| `002_create_users.sql`             | `users` (depends on `retailers`)                          |
| `003_create_delivery_requests.sql` | `delivery_requests` (depends on `retailers`, `users`)     |
| `004_create_status_events.sql`     | `status_events` (depends on `delivery_requests`, `users`) |

Numbered strictly in dependency order, matching the established migration convention from prior sprints, no migration may reference a table that hasn't been created by an earlier-numbered file.

---

## 5. Open Question for Mark to Confirm

Should `users.retailer_id` be `NOT NULL` for all roles, or nullable for dispatcher/rider if the team decides dispatchers/riders can serve multiple retailers rather than one? This directly depends on finalizing Part 3's "dispatcher scope" decision as a hard rule, not a soft assumption, before migrations are written.
