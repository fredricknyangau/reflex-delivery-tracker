# Reflex - Presentation Deck Outline

## Problem → Solution → Architecture → Trade-offs → Roadmap

**Rule followed throughout:** one key takeaway per slide. Where a topic naturally carried two ideas, it was split into two slides rather than compressed.

---

## Slide 1 - Problem

**Takeaway:** Current delivery coordination relies on informal WhatsApp chats and phone calls, leading to lost requests, zero visibility, and no proof of delivery.

**Talking points:**

- **Coordination Gap:** No structured record of delivery requests means requests get lost or duplicated
- **Zero Visibility:** Retailers cannot answer "where is my delivery" without manually calling dispatchers/riders
- **Dispute Risk:** No proof of delivery leaves retailers vulnerable to "never delivered" claims without evidence
- _Source: `PROBLEM_AND_DESIGN.md`, Section 1.2_

**Speaker note:** Open with a real, human framing, "imagine calling five people to find out where your delivery is." Make the pain concrete before naming the system.

---

## Slide 2 - Solution

**Takeaway:** Reflex provides a unified system that tracks every delivery through a strict lifecycle with clear ownership and a permanent audit trail.

**Talking points:**

- **Trackable Lifecycle:** Every delivery request follows a strict progression from request to confirmed delivery
- **Clear Role Boundaries:** Scoped access for Retailer Staff, Dispatchers, and Riders ensures each actor only sees what they're responsible for
- **Verifiable Proof:** System-generated confirmation codes guarantee a delivery is only marked complete when physically verified
- _Source: `PROBLEM_AND_DESIGN.md`, Section 1.2, 1.3, 1.4; `ARCHITECTURE.md`, Section 3_

---

## Slide 3 - Architecture: The Data Model

**Takeaway:** The system is built around four objects, each with one clear responsibility, not a tangle of overlapping logic.

**Talking points:**

- Retailer, User (role-based: staff/dispatcher/rider), DeliveryRequest, StatusEvent
- DeliveryRequest owns its own state machine, this is the single most important design decision in the system
- _Source: `PROBLEM_AND_DESIGN.md`, Part 2_

**Speaker note:** Good moment to show the ERD visually, one diagram, don't read every column aloud.

---

## Slide 4 - Architecture: Stack & Flow

**Takeaway:** We chose a robust, lightweight stack focused on correctness and testability over unnecessary complexity.

**Talking points:**

- **FastAPI & PostgreSQL:** selected for async support and strong relational integrity
- **Raw SQL via asyncpg:** keeps schema and query intent explicit, avoiding ORM abstraction overhead
- **Plain HTML/CSS/JS:** avoids heavy frontend frameworks for three simple, static persona views
- _Source: `ARCHITECTURE.md`, Section 2_

**Speaker note:** Split from Slide 3 deliberately, "what the data model is" and "what the stack is and why" are two different ideas.

---

## Slide 5 - Architecture: State Machine & Layering

**Takeaway:** The delivery lifecycle is a strictly enforced state machine owned entirely by the backend service layer, never the routes or UI.

**Talking points:**

- **Single Source of Truth:** `DeliveryService` enforces transition rules (Requested → Assigned → Picked Up → Delivered)
- **Immutable Audit Trail:** every status change writes a `status_events` record, forming a permanent log
- **Thin Routes & UIs:** validation logic never drifts because frontend and routes only reflect state, not decide it
- _Source: `PROBLEM_AND_DESIGN.md`, Section 2.2; `ARCHITECTURE.md`, Section 3, 10_

---

## Slide 6 - Trade-offs

**Takeaway:** We accepted scoped delays and simpler structures to guarantee a fully functional, reliable system within a 4-day sprint.

**Talking points (condensed, headline + one line each):**

1. **Polling over WebSockets** - accepted an 8-second delay because polling is simple to test and robust under pressure ⚠️ _verify this number matches deployed config_
2. **Unified HTML over SPA** - accepted page navigation to avoid build systems and keep personas isolated
3. **Dual-Mode Sandbox Engine** - accepted non-persistent local data for the demo to avoid blocking UI development ⚠️ _confirm exactly what this means and whether a live demo against the real DB is still possible_
4. **Manual Rider Assignment** - accepted manual dispatching for now to avoid building complex automatic routing logic

- _Source: `TRADEOFFS.md`_

**Speaker note:** Say these fast and plainly, don't apologize for them, name them as deliberate engineering calls. **Do not present items flagged ⚠️ until confirmed and personally understood, see verification note below.**

---

## Slide 7 - Roadmap

**Takeaway:** Future iterations will focus on real-time reactivity and intelligent routing to scale the platform.

**Talking points, prioritized:**

1. **WebSockets/SSE (highest priority)** - move from polling to true real-time updates for dispatchers and riders
2. **Automatic Rider Assignment** - implement nearest-rider or load-balanced routing to remove dispatcher bottlenecks
3. **Multi-Warehouse/Multi-Retailer Routing** - expand dispatcher scope across multiple retailers or regions
4. **Authentication Integration** - replace the simple demo role selector with secure logins

- _Source: `TRADEOFFS.md`; `PROBLEM_AND_DESIGN.md`, Part 3; `ARCHITECTURE.md`, Section 9_

**Speaker note:** Prioritization is itself a signal of judgment, briefly explain why real-time comes first (it directly reverses the trade-off with the most user-facing cost).

---

## Slide 8 - Live Demo (Transition Slide, Minimal Text)

**Takeaway:** Watch the full lifecycle happen live, in under two minutes.

**Content:** Title card only, "Let's see it work", the demo itself carries this slide.

**Speaker note:** Follow `docs/DEMO_SCRIPT.md` if available, or `docs/WORKFLOW.md` Section 2 as the backbone: create request → assign → pickup → confirmation code → deliver → show history.

---

## Slide 9 - Closing

**Takeaway:** Reflex solves a real, specific gap for small Kenyan retailers, and every decision in it can be explained and defended.

**Talking points:**

- One-sentence restatement of the problem-to-solution arc
- Thank the panel, open the floor for questions

---
