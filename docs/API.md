# Reflex - API Specification

## Week 3 - The Readiness Sprint

**Status:** Draft, derived from `ARCHITECTURE.md` Section 5, `ERD.md`, and `WORKFLOW.md`
**Owners:** Stephen (backend), Fredrick (lead)

---

## 1. Overview & Architectural Principles

The Reflex API exposes endpoints for managing the lifecycle of small retailer delivery requests.

### Key Design Principles:

1. **Service-Enforced State Machine:** Transition rules (`Requested` → `Assigned` → `Picked Up` → `Delivered`) are strictly validated in the backend service layer, not in route handlers or client UIs.
2. **Immutable Audit Logging:** Every status change automatically writes an entry to `status_events`.
3. **Concurrency Protection:** State transitions (such as rider assignment) use atomic conditional updates to prevent race conditions.
4. **Verifiable Delivery:** Transitioning to `Delivered` requires submitting a matching system-generated `confirmation_code` created at pickup.

---

## 2. Common Standards

- **Base URL:** `/api/v1`
- **Content-Type:** `application/json`
- **Response Format:** Standardized JSON payload.

### Standard Error Response Structure:

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot transition request from 'Requested' directly to 'Delivered'.",
    "details": {
      "current_status": "Requested",
      "attempted_status": "Delivered"
    }
  }
}
```

---

## 3. Data Schemas

### `DeliveryRequest`

```json
{
  "id": 101,
  "retailer_id": 1,
  "created_by": 5,
  "customer_name": "Jane Wanjiku",
  "customer_phone": "+254712345678",
  "address": "Biashara Street, Shop 12",
  "item_description": "Electronics Package - 2kg",
  "status": "Picked Up",
  "assigned_rider_id": 12,
  "confirmation_code": "RFX-8492",
  "created_at": "2026-08-26T09:12:00Z",
  "updated_at": "2026-08-26T09:45:00Z"
}
```

### `StatusEvent`

```json
{
  "id": 501,
  "delivery_request_id": 101,
  "status": "Picked Up",
  "changed_by": 12,
  "changed_at": "2026-08-26T09:45:00Z"
}
```

---

## 4. Endpoints Reference

### 4.1 Create Delivery Request

Originates a new delivery request in the system. Initial status is set to `Requested`.

- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/requests`
- **Actor:** Retailer Staff

#### Request Body:

```json
{
  "retailer_id": 1,
  "created_by": 5,
  "customer_name": "Jane Wanjiku",
  "customer_phone": "+254712345678",
  "address": "Biashara Street, Shop 12",
  "item_description": "Electronics Package - 2kg"
}
```

#### Response (`201 Created`):

```json
{
  "id": 101,
  "retailer_id": 1,
  "created_by": 5,
  "customer_name": "Jane Wanjiku",
  "customer_phone": "+254712345678",
  "address": "Biashara Street, Shop 12",
  "item_description": "Electronics Package - 2kg",
  "status": "Requested",
  "assigned_rider_id": null,
  "confirmation_code": null,
  "created_at": "2026-08-26T09:12:00Z",
  "updated_at": "2026-08-26T09:12:00Z"
}
```

---

### 4.2 List Delivery Requests

Retrieves delivery requests with optional filtering. Used by all UIs for polling updates.

- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/requests`
- **Actor:** Retailer Staff, Dispatcher, Rider

#### Query Parameters:

| Parameter           | Type    | Required | Description                                                          |
| :------------------ | :------ | :------- | :------------------------------------------------------------------- |
| `retailer_id`       | Integer | Optional | Filter by business account ID                                        |
| `status`            | String  | Optional | Filter by status (`Requested`, `Assigned`, `Picked Up`, `Delivered`) |
| `assigned_rider_id` | Integer | Optional | Filter deliveries assigned to a specific rider                       |

#### Response (`200 OK`):

```json
[
  {
    "id": 101,
    "retailer_id": 1,
    "created_by": 5,
    "customer_name": "Jane Wanjiku",
    "customer_phone": "+254712345678",
    "address": "Biashara Street, Shop 12",
    "item_description": "Electronics Package - 2kg",
    "status": "Requested",
    "assigned_rider_id": null,
    "confirmation_code": null,
    "created_at": "2026-08-26T09:12:00Z",
    "updated_at": "2026-08-26T09:12:00Z"
  }
]
```

---

### 4.3 Get Delivery Request Details

Fetch current details of a single delivery request.

- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/requests/{id}`
- **Actor:** Any

#### Response (`200 OK`):

```json
{
  "id": 101,
  "retailer_id": 1,
  "created_by": 5,
  "customer_name": "Jane Wanjiku",
  "customer_phone": "+254712345678",
  "address": "Biashara Street, Shop 12",
  "item_description": "Electronics Package - 2kg",
  "status": "Assigned",
  "assigned_rider_id": 12,
  "confirmation_code": null,
  "created_at": "2026-08-26T09:12:00Z",
  "updated_at": "2026-08-26T09:20:00Z"
}
```

---

### 4.4 Assign Rider to Request

Assigns a specific rider to an open delivery request. Transitions status from `Requested` → `Assigned`.

- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/requests/{id}/assign`
- **Actor:** Dispatcher

#### Request Body:

```json
{
  "dispatcher_id": 2,
  "rider_id": 12
}
```

#### Response (`200 OK`):

```json
{
  "id": 101,
  "status": "Assigned",
  "assigned_rider_id": 12,
  "updated_at": "2026-08-26T09:20:00Z"
}
```

#### Error Handling:

- `400 Bad Request`: If status is not `Requested`.
- `409 Conflict`: If another dispatcher assigned the request concurrently.

---

### 4.5 Update Request Lifecycle Status

Advances the delivery lifecycle step. Used for `Picked Up` and `Delivered` transitions.

- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/requests/{id}/status`
- **Actor:** Rider

#### Transition 1: Mark as Picked Up (`Assigned` → `Picked Up`)

Generates the verification code for delivery confirmation.

##### Request Body:

```json
{
  "rider_id": 12,
  "status": "Picked Up"
}
```

##### Response (`200 OK`):

```json
{
  "id": 101,
  "status": "Picked Up",
  "confirmation_code": "RFX-8492",
  "updated_at": "2026-08-26T09:45:00Z"
}
```

---

#### Transition 2: Mark as Delivered (`Picked Up` → `Delivered`)

Requires entering/scanning the `confirmation_code` generated during pickup.

##### Request Body:

```json
{
  "rider_id": 12,
  "status": "Delivered",
  "confirmation_code": "RFX-8492"
}
```

##### Response (`200 OK`):

```json
{
  "id": 101,
  "status": "Delivered",
  "confirmation_code": "RFX-8492",
  "updated_at": "2026-08-26T10:15:00Z"
}
```

##### Error Handling:

- `400 Bad Request` (Invalid Code):
  ```json
  {
    "error": {
      "code": "CONFIRMATION_CODE_MISMATCH",
      "message": "The provided confirmation code does not match."
    }
  }
  ```
- `400 Bad Request` (Invalid State Transition):
  ```json
  {
    "error": {
      "code": "INVALID_STATE_TRANSITION",
      "message": "Request must be in 'Picked Up' status before marking as 'Delivered'."
    }
  }
  ```

---

### 4.6 Fetch Delivery History (Audit Log)

Returns the chronological timeline of all status changes for a request.

- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/requests/{id}/history`
- **Actor:** Any

#### Response (`200 OK`):

```json
[
  {
    "id": 500,
    "delivery_request_id": 101,
    "status": "Requested",
    "changed_by": 5,
    "user_name": "Alice Retailer",
    "changed_at": "2026-08-26T09:12:00Z"
  },
  {
    "id": 501,
    "delivery_request_id": 101,
    "status": "Assigned",
    "changed_by": 2,
    "user_name": "Bob Dispatcher",
    "changed_at": "2026-08-26T09:20:00Z"
  },
  {
    "id": 502,
    "delivery_request_id": 101,
    "status": "Picked Up",
    "changed_by": 12,
    "user_name": "Charlie Rider",
    "changed_at": "2026-08-26T09:45:00Z"
  },
  {
    "id": 503,
    "delivery_request_id": 101,
    "status": "Delivered",
    "changed_by": 12,
    "user_name": "Charlie Rider",
    "changed_at": "2026-08-26T10:15:00Z"
  }
]
```

---

## 5. State Transition Enforcement Matrix

| Current State | Target State    | Allowed? | Required Fields / Conditions                                |
| :------------ | :-------------- | :------- | :---------------------------------------------------------- |
| _None_        | `Requested`     | Yes      | Valid request payload from `Retailer Staff`                 |
| `Requested`   | `Assigned`      | Yes      | Assigned by `Dispatcher` to valid `rider_id`                |
| `Assigned`    | `Picked Up`     | Yes      | Called by assigned `Rider`; generates `confirmation_code`   |
| `Picked Up`   | `Delivered`     | Yes      | Submitted `confirmation_code` matches stored code           |
| _Any_         | _Skipped State_ | **No**   | Service rejects transition (e.g. `Requested` → `Delivered`) |
| `Delivered`   | _Any State_     | **No**   | Terminal state; no modifications allowed                    |

---

## 6. HTTP Status Code Summary

| Code                        | Usage                                                                     |
| :-------------------------- | :------------------------------------------------------------------------ |
| `200 OK`                    | Request succeeded (fetch, update, status transition).                     |
| `201 Created`               | Request resource successfully created.                                    |
| `400 Bad Request`           | Invalid payload, invalid state transition, or confirmation code mismatch. |
| `404 Not Found`             | Requested delivery request or entity ID does not exist.                   |
| `409 Conflict`              | Concurrent modification conflict (e.g., duplicate assignment).            |
| `500 Internal Server Error` | Server-side execution failure.                                            |
