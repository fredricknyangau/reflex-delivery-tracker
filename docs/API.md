# Reflex - API Specification

This document details the HTTP endpoints, payload shapes, and status codes expected by the frontend client (`frontend/api.js`).

---

## 1. Retailer Endpoints

### 1.1. Get All Retailers
Used by the Landing / Demo selector to list available retailer businesses.

*   **URL:** `/retailers`
*   **Method:** `GET`
*   **Success Response:**
    *   **Code:** `200 OK`
    *   **Content:**
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

---

## 2. User Profiles Endpoints

### 2.1. List Users
Used by the landing selector to load user profiles, and by the dispatcher to retrieve riders for assignment.

*   **URL:** `/users`
*   **Method:** `GET`
*   **Query Parameters:**
    *   `role` (optional, e.g. `rider`, `retailer_staff`, `dispatcher`)
    *   `retailer_id` (optional, e.g. `1`)
*   **Success Response:**
    *   **Code:** `200 OK`
    *   **Content:**
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

---

## 3. Delivery Request Endpoints

### 3.1. Create Delivery Request
Retailer staff logs a new delivery. The request starts in `Requested` status.

*   **URL:** `/requests`
*   **Method:** `POST`
*   **Request Body:**
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
*   **Success Response:**
    *   **Code:** `200 OK` or `201 Created`
    *   **Content:**
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

### 3.2. Fetch Delivery Requests
Retrieves delivery requests filtered by query parameters. Used for list displays and polling.

*   **URL:** `/requests`
*   **Method:** `GET`
*   **Query Parameters:**
    *   `retailer_id` (optional, e.g. `1`)
    *   `status` (optional, e.g. `Requested`)
    *   `assigned_to` (optional, e.g. `3` - resolves to rider ID)
*   **Success Response:**
    *   **Code:** `200 OK`
    *   **Content:**
        ```json
        [
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
        ]
        ```

### 3.3. Assign Rider to Request
Dispatcher assigns an available rider. Transitions status `Requested` $\rightarrow$ `Assigned`.

*   **URL:** `/requests/{id}/assign`
*   **Method:** `POST`
*   **Request Body:**
    ```json
    {
      "assigned_rider_id": 3,
      "changed_by": 2
    }
    ```
*   **Success Response:**
    *   **Code:** `200 OK`
    *   **Content:**
        ```json
        {
          "id": 101,
          "status": "Assigned",
          "assigned_rider_id": 3,
          "updated_at": "2026-08-26T16:35:00Z"
        }
        ```
*   **Error Responses:**
    *   **Code:** `409 Conflict` (If request has already been assigned)
        ```json
        {
          "detail": "Already assigned to Charlie Kamau"
        }
        ```

### 3.4. Update Delivery Lifecycle Status
Rider advances the status of a delivery. Valid transitions are:
1.  `Assigned` $\rightarrow$ `Picked Up` (Generates and stores the confirmation code).
2.  `Picked Up` $\rightarrow$ `Delivered` (Requires providing the matching validation code).

*   **URL:** `/requests/{id}/status`
*   **Method:** `POST`
*   **Request Body (Pickup):**
    ```json
    {
      "status": "Picked Up",
      "changed_by": 3
    }
    ```
*   **Success Response (Pickup):**
    *   **Code:** `200 OK`
    *   **Content:** (Must return the generated `confirmation_code`)
        ```json
        {
          "id": 101,
          "status": "Picked Up",
          "confirmation_code": "RX-584712",
          "updated_at": "2026-08-26T16:45:00Z"
        }
        ```
*   **Request Body (Delivered):**
    ```json
    {
      "status": "Delivered",
      "changed_by": 3,
      "confirmation_code": "RX-584712"
    }
    ```
*   **Success Response (Delivered):**
    *   **Code:** `200 OK`
    *   **Content:**
        ```json
        {
          "id": 101,
          "status": "Delivered",
          "updated_at": "2026-08-26T17:15:00Z"
        }
        ```
*   **Error Responses:**
    *   **Code:** `400 Bad Request` (Invalid status transition order or incorrect confirmation code)
        ```json
        {
          "detail": "Invalid confirmation code."
        }
        ```

### 3.5. Fetch Single Request
Retrieves state for a single delivery request.

*   **URL:** `/requests/{id}`
*   **Method:** `GET`
*   **Success Response:**
    *   **Code:** `200 OK`
    *   **Content:**
        ```json
        {
          "id": 101,
          "retailer_id": 1,
          "created_by": 1,
          "customer_name": "Margaret Nduta",
          "customer_phone": "0700112233",
          "address": "Ngong Road, Suite 4B",
          "item_description": "Carton of Cooking Oil (12L)",
          "status": "Delivered",
          "assigned_rider_id": 3,
          "confirmation_code": "RX-584712",
          "created_at": "2026-08-26T16:27:00Z",
          "updated_at": "2026-08-26T17:15:00Z"
        }
        ```

### 3.6. Fetch Request Status History (Audit Trail)
Used to construct the chronological lifecycle proof of delivery.

*   **URL:** `/requests/{id}/history`
*   **Method:** `GET`
*   **Success Response:**
    *   **Code:** `200 OK`
    *   **Content:** (Sorted in chronological order)
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
          },
          {
            "id": 2,
            "delivery_request_id": 101,
            "status": "Assigned",
            "changed_by": 2,
            "changed_by_name": "Bob Mwangi",
            "changed_by_role": "dispatcher",
            "changed_at": "2026-08-26T16:35:00Z"
          },
          {
            "id": 3,
            "delivery_request_id": 101,
            "status": "Picked Up",
            "changed_by": 3,
            "changed_by_name": "Charlie Kamau",
            "changed_by_role": "rider",
            "changed_at": "2026-08-26T16:45:00Z"
          },
          {
            "id": 4,
            "delivery_request_id": 101,
            "status": "Delivered",
            "changed_by": 3,
            "changed_by_name": "Charlie Kamau",
            "changed_by_role": "rider",
            "changed_at": "2026-08-26T17:15:00Z"
          }
        ]
        ```
