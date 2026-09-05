# Reflex - System Requirements & Delivery Workflow Specification

## 1. Overview & Context

Reflex is a lightweight, reliable delivery coordination and tracking platform designed for small Kenyan retail businesses. Currently, retailers coordinate logistics informally over phone calls and WhatsApp messages, resulting in three systemic failures:
1. **Lost or duplicated orders** due to lack of a centralized request ledger.
2. **Ambiguous ownership** of deliveries with no real-time status visibility.
3. **Lack of verifiable proof of delivery**, leading to untraceable customer disputes.

Reflex solves this by establishing a strict, single trackable delivery lifecycle with distinct persona boundaries, an authoritative backend state machine, and an immutable audit trail (`status_events`).

---

## 2. Personas & Functional Requirements

Reflex defines three distinct user personas, each operating with specific responsibilities:

```
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│     Retailer Staff      │       │       Dispatcher        │       │          Rider          │
├─────────────────────────┤       ├─────────────────────────┤       ├─────────────────────────┤
│ • Creates requests      │       │ • Monitors open orders  │       │ • Views assigned tasks  │
│ • Monitors order status │ ───▶  │ • Manually assigns rider│ ───▶  │ • Marks Picked Up       │
│ • Views audit trail     │       │ • Tracks all deliveries │       │ • Verifies code         │
│                         │       │ • Prevents collisions   │       │ • Confirms Delivery     │
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
```

### 2.1. Retailer Staff
*   **Create Delivery Request:** Enter customer name, customer phone number, delivery address, and item description.
*   **Submit Request:** Submits request to backend (`POST /requests`), initializing the order with `status = 'Requested'`.
*   **View Requests & Status:** Monitor all requests originated by their retailer business in real-time (`Requested`, `Assigned`, `Picked Up`, `Delivered`).
*   **View Assigned Rider:** See which rider has been allocated once assigned by dispatch.
*   **View Status History:** Open the chronological timeline audit log (`GET /requests/{id}/history`) to inspect exact state transition timestamps and responsible actors.

### 2.2. Dispatcher
*   **View Incoming Open Requests:** Monitor a dedicated view of unassigned requests where `status = 'Requested'` (`GET /requests?retailer_id={id}&status=Requested`).
*   **Manual Rider Allocation:** Select an available active rider from the retailer's roster and submit assignment (`POST /requests/{id}/assign`).
*   **Concurrency Collision Protection:** If two dispatchers attempt to assign the same request simultaneously, the system uses an atomic conditional check (`WHERE id=$1 AND status='Requested'`). The second dispatcher receives an explicit error message (*"Unable to assign. This delivery has already been assigned."*) rather than silently corrupting state.
*   **Track All Deliveries:** Monitor active and completed deliveries across the retailer to oversee end-to-end fulfillment.
*   **View Audit Trail:** Inspect status history for any request.

### 2.3. Rider
*   **View Assigned Deliveries:** View only orders specifically allocated to the rider's user ID (`GET /requests?assigned_to={user_id}`).
*   **Mark as Picked Up:** When physical custody begins at the retail location, trigger the transition `Assigned` $\rightarrow$ `Picked Up` (`POST /requests/{id}/status`).
*   **Display Generated Confirmation Code:** Upon successful pickup, receive and display the authoritative system-generated confirmation code (e.g. `RX-584712`).
*   **Code Verification at Site:** Prompt customer for the confirmation code at the delivery destination.
*   **Confirm Delivery:** Submit the entered confirmation code with the completion request (`POST /requests/{id}/status`). If the code matches and current status is `Picked Up`, the delivery transitions to `Delivered`.
*   **Reject Invalid Confirmations:** If an invalid code is supplied or if pickup has not occurred, the transition is rejected with a clear user alert, and the status remains `Picked Up`.
*   **View Audit Trail:** Inspect delivery timeline history.

---

## 3. Delivery Lifecycle & State Machine

Every delivery request progresses through a strictly linear, four-stage state machine:

```
               POST /requests
                     │
                     ▼
              ┌─────────────┐
              │  Requested  │  (Unassigned, created by Retailer)
              └─────────────┘
                     │  POST /requests/{id}/assign
                     ▼
              ┌─────────────┐
              │  Assigned   │  (Allocated to specific Rider by Dispatcher)
              └─────────────┘
                     │  POST /requests/{id}/status { status: "Picked Up" }
                     ▼
              ┌─────────────┐
              │  Picked Up  │  (Confirmation code generated & stored)
              └─────────────┘
                     │  POST /requests/{id}/status { status: "Delivered", confirmation_code: "..." }
                     ▼
              ┌─────────────┐
              │  Delivered  │  (Final state, confirmed via code matching)
              └─────────────┘
```

### State Machine Invariants & Rules:
1. **No Out-of-Order Skipping:** Transitions must occur strictly sequentially (`Requested` $\rightarrow$ `Assigned` $\rightarrow$ `Picked Up` $\rightarrow$ `Delivered`). Out-of-order transitions (e.g., `Requested` $\rightarrow$ `Delivered`) are strictly rejected by the service layer.
2. **Immutable History:** Every valid state transition appends an immutable row to `status_events` recording `delivery_request_id`, `status`, `changed_by`, and `changed_at`.
3. **Custody-Bound Confirmation Codes:** The confirmation code is generated solely upon transition to `Picked Up` to ensure verification is tied to physical transfer of goods.
4. **Authoritative Backend Validation:** Validation rules, state transitions, and concurrency checks are enforced authoritatively by the backend service layer.

---

## 4. Non-Functional & Operational Requirements

*   **Responsive Multi-Device Support:** The UI must be fully responsive and touch-friendly across Mobile (320px–430px), Tablet (768px–1024px), and Desktop (1280px+).
*   **Periodic Polling Synchronization:** Data synchronization is accomplished via lightweight client-side polling (`setInterval` + `fetch` at 8-second intervals) to maintain simple, robust, real-time sync without WebSocket overhead.
*   **Demo / Sandbox Mode:** When backend services are unreachable or undergoing maintenance, the frontend features an automatic local sandbox fallback that replicates state machine rules and schemas for demonstration integrity.
*   **Lightweight & Dependency-Free:** Built with vanilla HTML5, modern responsive CSS, and pure JavaScript.
