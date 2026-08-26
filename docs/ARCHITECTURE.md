# Reflex - System Architecture

## Week 3 - The Readiness Sprint

**Status:** Living document, expands Part 4 of `PROBLEM_AND_DESIGN.md`
**Owners:** Fredrick (lead), Stephen (backend)

---

## 1. Purpose

This document defines how Reflex is actually built, translating the domain model and design decisions from `PROBLEM_AND_DESIGN.md` into concrete architecture: stack, layering, component boundaries, API surface, and data flow.

Every decision here traces back to a reason recorded in the design doc. Nothing here is arbitrary, if a panel asks "why," the answer should already exist in either this document or `PROBLEM_AND_DESIGN.md`.

---

## 2. Technology Stack

| Layer             | Choice                                        | Reasoning                                                                                                                                                           |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend framework | FastAPI (Python 3.12, async)                  | Established, proven pattern from prior sprints; async support fits polling-based sync well                                                                          |
| Database          | PostgreSQL                                    | Relational integrity matters here, delivery requests, users, and status history are strongly related; raw SQL keeps schema and query intent explicit                |
| Database access   | Raw SQL via asyncpg, no ORM                   | Matches established engineering preference; avoids abstraction overhead on a schema this size; every query is inspectable and explainable line by line in a defense |
| Frontend          | Plain HTML/CSS/JavaScript, `fetch()`          | No framework overhead needed for 3 simple persona-scoped views under a 4-day constraint                                                                             |
| Sync mechanism    | Client-side polling (`setInterval` + `fetch`) | Chosen explicitly over WebSockets, see Section 7                                                                                                                    |

**Explicitly rejected, with reasoning:**

- **ORM (SQLAlchemy, etc.):** adds abstraction without adding correctness for a schema this small; raw SQL is more defensible line-by-line under cross-examination.
- **WebSockets / real-time push:** correct engineering answer for true real-time, but adds real implementation and testing risk under a 4-day deadline; polling is simpler to build correctly and verify.
- **A frontend framework (React, etc.):** three simple, mostly-static persona views don't justify the setup and build-tooling overhead this week.

---

## 3. Layered Architecture

```
Routes (FastAPI)
   ↓  - receive HTTP request, validate input shape, call a service function
Services (delivery_service.py)
   ↓  - owns the DeliveryRequest state machine; the only place transition rules are enforced
Persistence (raw SQL / asyncpg)
   ↓
PostgreSQL
```

**The critical rule, carried directly from the design doc:** state-transition logic lives in the Services layer, nowhere else. Routes never decide whether a transition is valid, they only call the service and translate its result into an HTTP response. The frontend never decides validity either, it reflects whatever the backend returns.

This single rule is what prevents the same validation logic from drifting out of sync across three different places (route, service, frontend), which is exactly the kind of fragility the "edge cases" panel question category is designed to expose.

---

## 4. Component Diagram

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Retailer Staff  │   │    Dispatcher    │   │      Rider       │
│       UI         │   │        UI        │   │        UI        │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │  POST /requests       │  GET /requests?status=Requested  │  GET /requests?assigned_to=me
         │                       │  POST /requests/{id}/assign      │  POST /requests/{id}/status
         └───────────────────────┴───────────────────────┬─────────┘
                                                            │
                                                            ▼
                                                  ┌─────────────────┐
                                                  │  FastAPI Routes  │
                                                  └────────┬─────────┘
                                                            │
                                                            ▼
                                                  ┌─────────────────┐
                                                  │ DeliveryService  │
                                                  │ (state machine)  │
                                                  └────────┬─────────┘
                                                            │
                                                            ▼
                                                  ┌─────────────────┐
                                                  │   PostgreSQL     │
                                                  │  retailers       │
                                                  │  users            │
                                                  │  delivery_requests│
                                                  │  status_events    │
                                                  └───────────────────┘
```

---

## 5. API Surface

| Method | Path                              | Actor                      | Purpose                                                    |
| ------ | --------------------------------- | -------------------------- | ---------------------------------------------------------- |
| POST   | `/requests`                       | Retailer Staff             | Create a new delivery request (status = `Requested`)       |
| GET    | `/requests?retailer_id=&status=`  | Retailer Staff, Dispatcher | List requests, filtered by retailer and/or status          |
| POST   | `/requests/{id}/assign`           | Dispatcher                 | Assign a rider (status: `Requested` → `Assigned`)          |
| GET    | `/requests?assigned_to={user_id}` | Rider                      | List a rider's own assigned deliveries                     |
| POST   | `/requests/{id}/status`           | Rider                      | Advance status (`Assigned` → `Picked Up` → `Delivered`)    |
| GET    | `/requests/{id}`                  | Any                        | Fetch a single request's current state (used for polling)  |
| GET    | `/requests/{id}/history`          | Any                        | Fetch the full `status_events` audit trail for one request |

**Design rule enforced at the service layer, not the route layer:** each of these transition endpoints validates the _current_ status before allowing the _next_ status. An out-of-order call (e.g., marking `Delivered` while still `Requested`) returns a clear rejection, not a silent no-op and not a crash.

---

## 6. Confirmation Flow (Scanning)

Per `PROBLEM_AND_DESIGN.md` Part 3, "scanning" resolves to a system-generated confirmation code, not external hardware.

```
Rider marks Picked Up
        │
        ▼
System generates confirmation_code, stored on delivery_requests
        │
        ▼
Code displayed to rider (as text or QR, rendered client-side from the code)
        │
        ▼
At delivery, code is entered/scanned and submitted with the Delivered transition
        │
        ▼
Service validates code matches before allowing Delivered transition
        │
   Match?  ──NO──▶  reject, status stays Picked Up
        │
       YES
        │
        ▼
Status → Delivered, status_events row written
```

This mirrors the `print_job_id` correlation pattern already proven working in the Meridian Pivot check-in kiosk, a genuinely reused, validated design decision, not a new invention under time pressure.

---

## 7. Sync Strategy - Why Polling, Named Explicitly

The brief mentions "syncing to get real-time requests." The correct engineering answer for true real-time is WebSockets or server-sent events. Given the 4-day constraint, **polling was chosen deliberately**:

- Dispatcher and Rider UIs call `GET /requests?...` on a fixed interval (proposed: every 5-10 seconds)
- Simpler to implement correctly, simpler to test, lower risk of a half-working real-time feature under deadline pressure
- **Cost accepted:** a few seconds of delay before a dispatcher sees a new request, or a rider sees a new assignment

**This is Trade-off #1** for `docs/TRADEOFFS.md`: _"We chose polling over WebSockets because our timeline favored a simpler mechanism we could fully test, over a more sophisticated one we might not finish correctly. With more time, we'd move the Dispatcher and Rider views to a WebSocket or SSE channel for genuine real-time updates."_

---

## 8. Failure Boundaries

Following the same "design for failure early" discipline used in prior sprints:

- **Invalid state transition attempted:** service layer rejects with a clear error, current state is never corrupted.
- **Confirmation code mismatch:** `Delivered` transition is rejected, request remains `Picked Up`, no partial state written.
- **Concurrent assignment attempt** (two dispatchers try to assign the same request simultaneously): handled via the same atomic conditional-UPDATE pattern proven in the Meridian Pivot project, `UPDATE delivery_requests SET status='Assigned', assigned_rider_id=$2 WHERE id=$1 AND status='Requested' RETURNING id`. Only one dispatcher's request succeeds; the second sees zero rows returned and is told the request is already assigned.

---

## 9. Scope Boundaries

**In scope:** the 4-entity domain model, full state machine, confirmation-code flow, polling-based sync, 3 persona-scoped UIs, full audit trail via `status_events`.

**Explicitly out of scope, named as trade-offs, not hidden gaps:** authentication/login (roles assumed via a simple selector for demo purposes), real-time push, multi-region/multi-warehouse dispatcher routing, automatic rider assignment, SMS/notification integration.

---

## 10. Summary

The architecture's single organizing idea: **the delivery lifecycle is a state machine owned by one service layer, backed by an immutable event log, with every layer above it (routes, UI) treated as a thin reflection of that state, never an independent source of truth about what's allowed to happen next.**
