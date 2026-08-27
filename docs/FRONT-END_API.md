# Reflex Frontend API Reference

This document is the frontend-facing companion to [API.md](API.md). It records the existing HTTP contract used by `frontend/api.js`; it does not define new endpoints or change backend behavior.

## Base URL

The current client uses:

```text
http://localhost:8000
```

The frontend sends JSON requests with `Content-Type: application/json` for `POST` operations. The backend remains the source of truth for delivery state and transition validity.

## Roles and Identifiers

The demo selector loads user profiles from `GET /users`. User IDs are numeric and are sent as `created_by` or `changed_by` values.

Supported roles are:

- `retailer_staff`
- `dispatcher`
- `rider`

Retailer and dispatcher views use `retailer_id` to scope requests. The rider view uses the rider's user ID with the `assigned_to` filter.

## Retailers

### `GET /retailers`

Loads retailer businesses for the demo selector and for rider pickup details.

Success: `200 OK`

```json
[
  {
    "id": 1,
    "business_name": "QuickMart CBD",
    "phone": "0711222333",
    "address": "Moi Avenue, Nairobi"
  }
]
```

## Users

### `GET /users`

Optional query parameters:

- `role`: `rider`, `retailer_staff`, or `dispatcher`
- `retailer_id`: numeric retailer ID

The dispatcher uses `role=rider&retailer_id={id}` to load riders for manual assignment.

```json
[
  {
    "id": 3,
    "retailer_id": 1,
    "name": "Charlie Kamau",
    "phone": "0788333444",
    "role": "rider"
  }
]
```

## Delivery Requests

### `POST /requests`

Creates a request. The backend creates it with status `Requested` and writes the initial history event.

```json
{
  "retailer_id": 1,
  "created_by": 1,
  "customer_name": "Margaret Nduta",
  "customer_phone": "0700112233",
  "address": "Ngong Road, Suite 4B",
  "item_description": "Carton of Cooking Oil (12L)"
}
```

Success: `200 OK` or `201 Created`. The response is a delivery request object:

```json
{
  "id": 101,
  "retailer_id": 1,
  "created_by": 1,
  "customer_name": "Margaret Nduta",
  "customer_phone": "0700112233",
  "address": "Ngong Road, Suite 4B",
  "item_description": "Carton of Cooking Oil (12L)",
  "status": "Requested",
  "assigned_rider_id": null,
  "confirmation_code": null,
  "created_at": "2026-08-26T16:27:00Z",
  "updated_at": "2026-08-26T16:27:00Z"
}
```

### `GET /requests`

Optional query parameters:

- `retailer_id`: numeric retailer ID
- `status`: one lifecycle status, such as `Requested`
- `assigned_to`: numeric rider user ID

The client polls this endpoint every 8 seconds on the Retailer, Dispatcher, and Rider views.

The response is an array of delivery request objects using the shape above.

### `POST /requests/{id}/assign`

The dispatcher manually assigns a rider. This transitions `Requested` to `Assigned`.

```json
{
  "assigned_rider_id": 3,
  "changed_by": 2
}
```

Success: `200 OK`

```json
{
  "id": 101,
  "status": "Assigned",
  "assigned_rider_id": 3,
  "updated_at": "2026-08-26T16:35:00Z"
}
```

A concurrent or already-completed assignment returns `409 Conflict`, for example:

```json
{
  "detail": "Already assigned to Charlie Kamau"
}
```

### `POST /requests/{id}/status`

The rider advances the delivery through the remaining lifecycle. Valid statuses are exactly:

```text
Requested -> Assigned -> Picked Up -> Delivered
```

Pickup request, which causes the backend to generate and store the confirmation code:

```json
{
  "status": "Picked Up",
  "changed_by": 3
}
```

Pickup success: `200 OK`. The response must include the generated `confirmation_code`:

```json
{
  "id": 101,
  "status": "Picked Up",
  "confirmation_code": "RX-584712",
  "updated_at": "2026-08-26T16:45:00Z"
}
```

Delivery request, submitted after the rider receives the code:

```json
{
  "status": "Delivered",
  "changed_by": 3,
  "confirmation_code": "RX-584712"
}
```

Delivery success: `200 OK`. An invalid order or code returns `400 Bad Request`, for example:

```json
{
  "detail": "Invalid confirmation code."
}
```

The frontend displays the returned pickup code and submits it for delivery verification. It does not generate the authoritative code or decide whether a transition is valid.

### `GET /requests/{id}`

Fetches the current state of one request. Used by the history dialogs and available to any demo role.

Success: `200 OK`, with the complete delivery request object.

### `GET /requests/{id}/history`

Fetches the chronological status audit trail for one request.

Success: `200 OK`

```json
[
  {
    "id": 1,
    "delivery_request_id": 101,
    "status": "Requested",
    "changed_by": 1,
    "changed_by_name": "Alice Wambui",
    "changed_by_role": "retailer_staff",
    "changed_at": "2026-08-26T16:27:00Z"
  }
]
```

The frontend sorts events oldest-first when rendering the history timeline. The complete sequence is `Requested`, `Assigned`, `Picked Up`, `Delivered` when the delivery is complete.

## Error Handling

The frontend surfaces backend `detail` messages for failed create, assignment, and status operations. The current client also has a localStorage-backed sandbox fallback for offline demos; that fallback mirrors the same endpoint shapes and lifecycle rules but is not authoritative when the API is available.
