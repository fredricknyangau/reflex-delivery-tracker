# Reflex - Architectural Trade-offs

This document records the design decisions and engineering trade-offs made during Week 3 (The Readiness Sprint) for the frontend of Reflex.

---

## 1. Trade-off #1: Polling over WebSockets

*   **Choice:** Client-side polling using `setInterval` and `fetch()` at 8-second intervals.
*   **Reasoning:**
    *   WebSockets or Server-Sent Events (SSE) are the ideal engineering patterns for real-time delivery state tracking.
    *   However, implementing WebSockets introduces significant backend connection handling and state management overhead, which introduces risk under a tight 4-day sprint deadline.
    *   Polling is extremely simple to implement correctly, easily testable, and robust against networking fluctuations.
    *   **Cost accepted:** Slight delay (up to 8 seconds) before the Dispatcher sees a new request or the Rider sees a new assignment. For Kenyan retail delivery tracking, sub-second reactivity is not a hard requirement, so this trade-off is highly acceptable.

---

## 2. Trade-off #2: Unified HTML sub-panels over Single Page App (SPA)

*   **Choice:** Structured multi-page directories (`/retailer`, `/dispatcher`, `/rider`) rather than a single massive HTML file or an SPA framework (like React/Vue).
*   **Reasoning:**
    *   Each of the three personas has a highly distinct set of responsibilities and UI forms.
    *   Dividing them into separate directories avoids a single 1500-line "monster" script, making debugging and maintenance highly isolated (a bug in the Rider flow cannot bleed into or break the Retailer submission flow).
    *   Avoiding frameworks like React eliminates build systems, transpilation overhead, and tool dependency issues, keeping the deployment foot-print small and fast.
    *   **Cost accepted:** Page loads trigger standard browser navigations rather than smooth client-side DOM replacement.

---

## 3. Trade-off #3: Dual-Mode Sandbox Engine

*   **Choice:** An API-first client that features a transparent client-side database sandbox using `localStorage` when the FastAPI server is offline.
*   **Reasoning:**
    *   The backend and frontend are built in parallel. Hardcoding static mock data directly in the components would violate the rule that the database is the source of truth, creating integration throwaway code.
    *   By putting the sandbox inside `api.js` and keeping the interface identical to real `fetch` queries, the frontend remains 100% ready to integrate with FastAPI. The UI receives identical JSON shapes regardless of whether it hits Postgres or the Sandbox.
    *   It guarantees that the demo is fully interactive and functional even if the database is unmigrated or the local server is turned off.
