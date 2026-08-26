# Reflex - Workflow & User Journey

## Week 3 - The Readiness Sprint

**Status:** Draft, expands `PROBLEM_AND_DESIGN.md` Part 2.5
**Owner:** Maria (persona experience), refined by Ibrahim from Thursday

---

## 1. Purpose

This document walks through the complete lifecycle of a single delivery, from the moment a retailer logs a request to the moment it's confirmed delivered, showing exactly what each of the three personas sees and does at every stage. It should be readable end to end by someone who has never seen the codebase, this is the document a non-technical panel member should be able to follow without translation.

---

## 2. The Full Journey, Step by Step

### Stage 1 - Request Created

**Actor:** Retailer Staff

1. Staff member opens the Retailer view.
2. Fills in: customer name, customer phone, delivery address, item description.
3. Submits the form.
4. System creates a new `delivery_requests` row with `status = Requested`.
5. A `status_events` entry is written: `Requested`, by this staff member, timestamped.
6. Staff member sees the request appear in "My Requests" with status **Requested**.

**What the retailer can NOT do at this stage:** assign a rider themselves, or mark it delivered. Their role ends at creating the request and watching its status.

---

### Stage 2 - Assignment

**Actor:** Dispatcher

1. Dispatcher opens the Dispatcher view, sees a list of all requests with `status = Requested` for their retailer.
2. Selects a request, selects an available rider from a list, clicks Assign.
3. System runs the atomic conditional update: `Requested → Assigned`, only succeeds if the request is still `Requested` (protects against two dispatchers assigning the same request at once, see `ARCHITECTURE.md` Section 8).
4. A `status_events` entry is written: `Assigned`, by this dispatcher.
5. The assigned rider's view will now show this request the next time it polls (see `ARCHITECTURE.md` Section 7).
6. Retailer's view updates (on their next poll) to show status **Assigned**.

**What happens on a failed assignment attempt:** if another dispatcher already assigned it a moment earlier, this dispatcher sees a clear message ("Already assigned to [rider name]") instead of a silent failure or a crash.

---

### Stage 3 - Pickup

**Actor:** Rider

1. Rider opens their view, sees only requests where `assigned_rider_id` is their own user ID.
2. Rider physically collects the item, then taps "Mark Picked Up" in the app.
3. System validates the current status is `Assigned` (rejects if somehow already `Picked Up` or `Delivered`).
4. Status transitions: `Assigned → Picked Up`.
5. System generates a `confirmation_code`, stored on the request, and displays it to the rider (as text, or rendered as a simple QR client-side).
6. A `status_events` entry is written: `Picked Up`, by this rider.
7. Retailer's view updates to show status **Picked Up**.

**Why the code is generated here, not earlier:** generating it at Pickup (not at request creation) ties the confirmation specifically to the moment physical custody actually begins, matching the real-world event it's meant to represent.

---

### Stage 4 - Delivery Confirmation

**Actor:** Rider (with the customer, in practice)

1. At the delivery location, the rider enters/scans the confirmation code (shown to the customer, or read back from wherever the rider recorded it).
2. Rider submits the code along with the "Mark Delivered" action.
3. System validates: current status must be `Picked Up`, AND the submitted code must match the stored `confirmation_code`.
4. If either check fails, the transition is rejected, status remains `Picked Up`, no partial state is written.
5. If both checks pass: status transitions `Picked Up → Delivered`.
6. A `status_events` entry is written: `Delivered`, by this rider.
7. Retailer's view updates to show status **Delivered**, this is also the final state.

---

### Stage 5 - Proof of Delivery (Always Available)

**Actor:** Any (typically Retailer, for disputes)

At any point, any actor can view the full `status_events` history for a request:

```
Requested   → 09:12, by [staff name]
Assigned    → 09:20, by [dispatcher name], to [rider name]
Picked Up   → 09:45, by [rider name]
Delivered   → 10:15, by [rider name]
```

This directly answers the original problem statement's requirement for "proof of delivery," it's not a single flag, it's a complete, timestamped, attributed history that can't be silently edited.

---

## 3. Full Journey Diagram (All Three Personas)

```
RETAILER STAFF                DISPATCHER                    RIDER

Create request
      │
      ▼
[Requested] ─────────────▶  Sees it in open list
                                    │
                                    ▼
                              Assigns a rider
                                    │
                                    ▼
                             [Assigned] ─────────────────▶ Sees it in "my deliveries"
                                                                    │
                                                                    ▼
                                                             Marks Picked Up
                                                                    │
                                                                    ▼
                                                          [Picked Up] + code generated
                                                                    │
                                                                    ▼
                                                          Confirms code at delivery
                                                                    │
                                                                    ▼
                                                             [Delivered]
      │                              │                              │
      ▼                              ▼                              ▼
      └──────────── All can view full status_events history ───────┘
```

---

## 4. Edge Cases Walked Through (Pre-empting the Panel's "Edge Cases" Category)

| Scenario                                                            | What Happens                                                                                                      |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Two dispatchers try to assign the same request at the same instant  | Atomic conditional update ensures only one succeeds; the other sees "already assigned"                            |
| Rider tries to mark Delivered without having marked Picked Up first | Rejected at the service layer, status unchanged, current status returned in the error                             |
| Wrong confirmation code submitted                                   | Delivery rejected, request stays at `Picked Up`, rider can retry with the correct code                            |
| Retailer tries to reassign a rider after assignment                 | Not supported in this scope, named as a roadmap item, not a silent gap                                            |
| Network drops mid-poll on the Rider view                            | Next successful poll simply reflects current true state, since the client never holds authoritative state locally |

---

## 5. What This Document Feeds Into

- **The deck's "Solution" and "Architecture" slides** - this journey is the plain-language version of the technical architecture, useful for explaining to a non-technical stakeholder
- **The demo script** - this is essentially the demo script's backbone already, walk through exactly these 5 stages live
- **The trade-off log** - Section 4's "not supported" row (reassignment) is a 4th candidate trade-off if the team wants more than three
