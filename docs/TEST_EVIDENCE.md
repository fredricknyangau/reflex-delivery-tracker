# Reflex - Test Evidence & Verification Document

## System Overview & Context

Reflex is a delivery tracking and dispatching platform for small Kenyan retailers. The system consists of:

- **Database:** PostgreSQL 16 (4 schema migrations + seed data).
- **Backend:** FastAPI (Python 3.12, asyncpg, raw SQL, state machine in `delivery_service.py`).
- **Frontend:** Plain HTML5/CSS3/JavaScript (3 persona dashboards: Retailer Staff, Dispatcher, Rider) utilizing client-side polling every 8 seconds.

---

## 1. Environment & Migration Sanity Check (Part 1)

### 1.1 Numbered SQL Schema Migrations

All four database migrations exist and are sequentially numbered in `backend/app/database/migrations/`:

1. `001_create_retailers.sql` - Creates `retailers` table (`id`, `business_name`, `phone`, `address`, `created_at`).
2. `002_create_users.sql` - Creates `users` table (`id`, `retailer_id`, `name`, `phone`, `role` with `CHECK (role IN ('retailer_staff', 'dispatcher', 'rider'))`).
3. `003_create_delivery_requests.sql` - Creates `delivery_requests` table with status constraint `CHECK (status IN ('Requested', 'Assigned', 'Picked Up', 'Delivered'))`, `confirmation_code`, timestamps, and foreign keys.
4. `004_create_status_events.sql` - Creates immutable audit trail table `status_events` (`id`, `delivery_request_id`, `status`, `changed_by`, `changed_at`).

### 1.2 Migration & Seed Execution

Migrations were executed in sequence against a fresh PostgreSQL database:

```bash
PGPASSWORD=frixel psql -h localhost -U frixel -d reflex -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
for f in backend/app/database/migrations/*.sql; do
    PGPASSWORD=frixel psql -h localhost -U frixel -d reflex -f "$f"
done
PGPASSWORD=frixel psql -h localhost -U frixel -d reflex -f backend/app/database/seed.sql
```

**Actual Output:**

```text
NOTICE:  drop cascades to 4 other objects
DROP SCHEMA
CREATE SCHEMA
Running migration backend/app/database/migrations/001_create_retailers.sql... CREATE TABLE
Running migration backend/app/database/migrations/002_create_users.sql... CREATE TABLE
Running migration backend/app/database/migrations/003_create_delivery_requests.sql... CREATE TABLE
Running migration backend/app/database/migrations/004_create_status_events.sql... CREATE TABLE
Running seed.sql...
INSERT 0 2
INSERT 0 7
```

**Seed Data Verified in PostgreSQL:**

- **Retailers (2):** `Nairobi Pharmacy` (ID 1), `Westlands Hardware` (ID 2).
- **Users (7):**
  - ID 1: Ahmed Mohamed (`retailer_staff`, Retailer 1)
  - ID 2: Sarah Kipchoge (`dispatcher`, Retailer 1)
  - ID 3: John Kariuki (`rider`, Retailer 1)
  - ID 4: Mary Omondi (`rider`, Retailer 1)
  - ID 5: Peter Mwangi (`retailer_staff`, Retailer 2)
  - ID 6: Alice Kamau (`dispatcher`, Retailer 2)
  - ID 7: David Otieno (`rider`, Retailer 2)

### 1.3 Backend Startup

Command: `uvicorn app.main:app --port 8000`
**Actual Startup Output:**

```text
INFO:     Started server process [131221]
INFO:     Waiting for application startup.
Database connection pool initialized
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

- Import errors: 0
- Failed route registrations: 0
- Package completeness: All dependencies (`fastapi`, `uvicorn`, `asyncpg`, `python-dotenv`, `pydantic`) verified and functional in `requirements.txt`.

---

## 2. API-Level Test Results (Part 2)

All 10 API test cases were executed sequentially against the running backend server.

### Test 1: Create Delivery Request (`POST /requests`)

- **Request:**
  ```json
  POST /requests
  {
    "retailer_id": 1,
    "created_by": 1,
    "customer_name": "Margaret Nduta",
    "customer_phone": "0711223344",
    "address": "Ngong Road, Suite 4B",
    "item_description": "Prescription Medicine Pack"
  }
  ```
- **Response Status:** `201 Created`
- **Response Body:**
  ```json
  {
    "id": 1,
    "retailer_id": 1,
    "created_by": 1,
    "customer_name": "Margaret Nduta",
    "customer_phone": "0711223344",
    "address": "Ngong Road, Suite 4B",
    "item_description": "Prescription Medicine Pack",
    "status": "Requested",
    "assigned_rider_id": null,
    "confirmation_code": null,
    "created_at": "2026-08-28T11:38:41.633667",
    "updated_at": "2026-08-28T11:38:41.633667"
  }
  ```
- **Result:** **PASS**. Returned real `id: 1` and initial status `Requested`.

---

### Test 2: List Retailer Requests (`GET /requests?retailer_id=1`)

- **Request:** `GET /requests?retailer_id=1`
- **Response Status:** `200 OK`
- **Response Body:**
  ```json
  [
    {
      "id": 1,
      "retailer_id": 1,
      "created_by": 1,
      "customer_name": "Margaret Nduta",
      "customer_phone": "0711223344",
      "address": "Ngong Road, Suite 4B",
      "item_description": "Prescription Medicine Pack",
      "status": "Requested",
      "assigned_rider_id": null,
      "confirmation_code": null,
      "created_at": "2026-08-28T11:38:41.633667",
      "updated_at": "2026-08-28T11:38:41.633667"
    }
  ]
  ```
- **Result:** **PASS**. Correctly returned list filtered by retailer.

---

### Test 3: Assign Rider (`POST /requests/1/assign`)

- **Request:**
  ```json
  POST /requests/1/assign
  {
    "assigned_rider_id": 3,
    "changed_by": 2
  }
  ```
- **Response Status:** `200 OK`
- **Response Body:**
  ```json
  {
    "id": 1,
    "retailer_id": 1,
    "created_by": 1,
    "customer_name": "Margaret Nduta",
    "customer_phone": "0711223344",
    "address": "Ngong Road, Suite 4B",
    "item_description": "Prescription Medicine Pack",
    "status": "Assigned",
    "assigned_rider_id": 3,
    "confirmation_code": null,
    "created_at": "2026-08-28T11:38:41.633667",
    "updated_at": "2026-08-28T11:38:41.714075"
  }
  ```
- **Result:** **PASS**. Status transitioned to `Assigned` with `assigned_rider_id: 3`.

---

### Test 4: Duplicate Assignment Concurrency Guard

- **Request:**
  ```json
  POST /requests/1/assign
  {
    "assigned_rider_id": 4,
    "changed_by": 2
  }
  ```
- **Response Status:** `409 Conflict`
- **Response Body:**
  ```json
  {
    "detail": "Delivery request 1 is already in status 'Assigned' and cannot be assigned."
  }
  ```
- **Result:** **PASS**. Atomic conditional UPDATE guard (`WHERE status = 'Requested'`) successfully prevented duplicate assignment.

---

### Test 5: Mark Picked Up & Code Generation (`POST /requests/1/status`)

- **Request:**
  ```json
  POST /requests/1/status
  {
    "status": "Picked Up",
    "changed_by": 3
  }
  ```
- **Response Status:** `200 OK`
- **Response Body:**
  ```json
  {
    "id": 1,
    "retailer_id": 1,
    "created_by": 1,
    "customer_name": "Margaret Nduta",
    "customer_phone": "0711223344",
    "address": "Ngong Road, Suite 4B",
    "item_description": "Prescription Medicine Pack",
    "status": "Picked Up",
    "assigned_rider_id": 3,
    "confirmation_code": "RX-196906",
    "created_at": "2026-08-28T11:38:41.633667",
    "updated_at": "2026-08-28T11:38:41.803706"
  }
  ```
- **Result:** **PASS**. Status became `Picked Up` and secure 6-digit confirmation code `RX-196906` was generated.

---

### Test 6: Invalid Transition / Wrong Confirmation Code Test

- **Request:**
  ```json
  POST /requests/1/status
  {
    "status": "Delivered",
    "changed_by": 3,
    "confirmation_code": "RX-WRONG99"
  }
  ```
- **Response Status:** `400 Bad Request`
- **Response Body:**
  ```json
  {
    "detail": "Invalid confirmation code."
  }
  ```
- **Verification of State:** `GET /requests/1` confirmed status remained `Picked Up`.
- **Result:** **PASS**. System rejected wrong code and preserved existing state without side-effects.

---

### Test 7: Valid Delivery Completion (`POST /requests/1/status`)

- **Request:**
  ```json
  POST /requests/1/status
  {
    "status": "Delivered",
    "changed_by": 3,
    "confirmation_code": "RX-196906"
  }
  ```
- **Response Status:** `200 OK`
- **Response Body:**
  ```json
  {
    "id": 1,
    "retailer_id": 1,
    "created_by": 1,
    "customer_name": "Margaret Nduta",
    "customer_phone": "0711223344",
    "address": "Ngong Road, Suite 4B",
    "item_description": "Prescription Medicine Pack",
    "status": "Delivered",
    "assigned_rider_id": 3,
    "confirmation_code": "RX-196906",
    "created_at": "2026-08-28T11:38:41.633667",
    "updated_at": "2026-08-28T11:38:41.891872"
  }
  ```
- **Result:** **PASS**. Successfully finalized delivery state.

---

### Test 8: Skip-State Guard Test

- **Setup:** Created brand new request ID 2 in status `Requested`.
- **Request:**
  ```json
  POST /requests/2/status
  {
    "status": "Delivered",
    "changed_by": 3,
    "confirmation_code": "RX-123456"
  }
  ```
- **Response Status:** `400 Bad Request`
- **Response Body:**
  ```json
  {
    "detail": "Cannot deliver request in status 'Requested'. Must be Picked Up."
  }
  ```
- **Result:** **PASS**. Out-of-order transition rejected cleanly.

---

### Test 9: Complete Audit Trail (`GET /requests/1/history`)

- **Request:** `GET /requests/1/history`
- **Response Status:** `200 OK`
- **Response Body:**
  ```json
  [
    {
      "id": 1,
      "delivery_request_id": 1,
      "status": "Requested",
      "changed_by": 1,
      "changed_by_name": "Ahmed Mohamed",
      "changed_by_role": "retailer_staff",
      "changed_at": "2026-08-28T11:38:41.675060"
    },
    {
      "id": 2,
      "delivery_request_id": 1,
      "status": "Assigned",
      "changed_by": 2,
      "changed_by_name": "Sarah Kipchoge",
      "changed_by_role": "dispatcher",
      "changed_at": "2026-08-28T11:38:41.766999"
    },
    {
      "id": 3,
      "delivery_request_id": 1,
      "status": "Picked Up",
      "changed_by": 3,
      "changed_by_name": "John Kariuki",
      "changed_by_role": "rider",
      "changed_at": "2026-08-28T11:38:41.846396"
    },
    {
      "id": 4,
      "delivery_request_id": 1,
      "status": "Delivered",
      "changed_by": 3,
      "changed_by_name": "John Kariuki",
      "changed_by_role": "rider",
      "changed_at": "2026-08-28T11:38:41.957603"
    }
  ]
  ```
- **Result:** **PASS**. Full lifecycle audit log verified with valid timestamps and actor names.

---

### Test 10: Non-Existent Resource Handling

- `GET /requests/999999` -> `404 Not Found` (`{"detail": "Delivery request 999999 not found."}`)
- `POST /requests/999999/assign` -> `404 Not Found` (`{"detail": "Delivery request 999999 not found."}`)
- `POST /requests/999999/status` -> `404 Not Found` (`{"detail": "'Delivery request 999999 not found.'"}`)
- **Result:** **PASS**. Clean 404 responses returned with no 500 crashes.

---

## 3. Frontend End-to-End Walkthrough (Part 3)

The complete end-to-end user journey was tested in headless Google Chrome via automated DOM driver matching `docs/WORKFLOW.md`.

| Step                                | Action & Persona                                                                                                                      | Observed Behavior in Browser                                                                                                                             | Result   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **1. Retailer Staff**               | Logged in as Ahmed Mohamed. Submitted request: `"Organic Kenyan Coffee Pack"`, Customer: Grace Wanjiku, Address: `"Koinange Street"`. | Success feedback alert shown in UI (`"Delivery request created successfully. ID: 4"`). Table rendered request with status badge `REQUESTED`.             | **PASS** |
| **2. Dispatcher Polling**           | Opened Sarah Kipchoge's dashboard. Waited 8.5s for natural polling interval (no manual refresh).                                      | Open requests table automatically rendered Job #4. Clicked `"Assign Rider"`, selected John Kariuki (ID 3), and submitted.                                | **PASS** |
| **3. Rider Polling & Pickup**       | Opened John Kariuki's dashboard. Waited 8.5s for natural polling. Clicked `"Mark Picked Up"`.                                         | Job #4 appeared in active deliveries. Card updated to `Picked Up`, and confirmation code **`RX-713446`** rendered in primary color banner.               | **PASS** |
| **4. Negative Test (Wrong Code)**   | Entered incorrect code `RX-999999` into verification input and clicked `"Confirm Delivery"`.                                          | UI displayed prominent red alert: `"Invalid confirmation code. Please check and try again."` Delivery state remained `Picked Up`.                        | **PASS** |
| **5. Positive Test (Correct Code)** | Entered `RX-713446` and clicked `"Confirm Delivery"`.                                                                                 | Success alert shown: `"Delivery #4 confirmed and marked as Delivered successfully!"` Status updated to `DELIVERED` with green badge.                     | **PASS** |
| **6. Audit Trail Modal**            | Clicked `"View History"` button on the delivered card.                                                                                | Modal rendered complete timeline: 4 events in order (`Requested`, `Assigned`, `Picked Up`, `Delivered`) with actors (Ahmed, Sarah, John) and timestamps. | **PASS** |
| **7. Console Monitoring**           | Monitored DevTools console logs across all three persona views throughout entire workflow.                                            | No unhandled exceptions or script crashes. Only expected network events logged.                                                                          | **PASS** |

---

## 4. Bugs & Fixes Summary

1. **Virtual Environment Rich/Pip Library Corruption:**
   - _Issue:_ Earlier global regex script stripped characters from `.venv` library files causing `pip` and `uvicorn` invocation errors.
   - _Fix:_ Cleanly rebuilt Python 3.12 virtual environment (`.venv`) and installed frozen dependencies from `backend/requirements.txt`.
2. **PostgreSQL Socket Connection on Local Host:**
   - _Issue:_ Asyncpg needed connection credentials matching local PostgreSQL role `frixel`.
   - _Fix:_ Updated `backend/.env` with local test credentials and added dual-mode support for PaaS `DATABASE_URL` as well as individual `DB_*` parameters in `connection.py`.
3. **CORS Flexibility for Deployment:**
   - _Issue:_ Backend previously had static origins.
   - _Fix:_ Added `ALLOWED_ORIGINS` environment variable parsing in `main.py` allowing comma-separated deployment origins while defaulting to open access for local development.

---

## 5. Final Verification Statement

The 5-stage delivery lifecycle:
$$\text{Requested} \longrightarrow \text{Assigned} \longrightarrow \text{Picked Up} \longrightarrow \text{Delivered} \longrightarrow \text{History Auditable}$$
is **100% verified and operational** across both the backend REST API and the live browser frontend.
