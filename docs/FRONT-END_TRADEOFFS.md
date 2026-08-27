# Reflex Frontend Trade-offs

This document records frontend-specific decisions for the Readiness Sprint. The decisions preserve a small, understandable demo surface while keeping the client ready to connect to the FastAPI backend.

## Polling over WebSockets

**Decision:** Use client-side polling with `setInterval` and `fetch()`.

**Where it is used:** The Retailer, Dispatcher, and Rider views refresh their request lists every 8 seconds. Manual refresh buttons are also available for an immediate update.

**Why:** The sprint has a limited four-day implementation window. Polling is straightforward to implement, inspect, test, and recover from when a request temporarily fails. It is sufficient for delivery coordination, where an update within a few seconds is acceptable.

**Cost accepted:** A new request or assignment can take up to approximately 8 seconds to appear without a manual refresh. Polling also makes repeated HTTP requests even when no state has changed.

**Why WebSockets were not selected for V1:** WebSockets would require connection lifecycle handling, reconnect behavior, backend support, and additional testing. That complexity was not justified for this sprint's lightweight workflow.

**Future consideration:** A later version could move dispatcher and rider updates to WebSockets or server-sent events if sub-second updates become a product requirement.

## Separate HTML Panels over a Single Page Application

**Decision:** Use separate, persona-scoped HTML panels at `frontend/retailer/`, `frontend/dispatcher/`, and `frontend/rider/`, sharing `style.css` and `api.js`.

**Why:** Each role has a distinct job and a small set of actions. Separate pages keep the markup and controller logic easy to read, avoid a build system, and limit changes in one workflow from affecting another. This is also well suited to a four-day prototype and a live demonstration.

**Cost accepted:** Moving between roles uses a normal page navigation, and shared behavior must be kept consistent across the individual controllers. The application does not provide SPA-style route transitions or a centralized component library.

## API-first Client with Demo Sandbox

**Decision:** Keep API calls centralized in `frontend/api.js`, with a localStorage-backed sandbox used when the FastAPI service is unavailable.

**Why:** The UI can be demonstrated while backend work is in progress without hardcoding mock responses into each persona view. The sandbox follows the same request shapes and valid status lifecycle as the documented API, so the UI remains ready for backend integration.

**Cost accepted:** Sandbox data is browser-local and is not shared with a real database or other users. It is strictly a demo fallback and must not be treated as production persistence.

## Backend-owned State Transitions

**Decision:** The frontend submits requested actions and renders the response; the backend owns lifecycle validation and authoritative confirmation-code generation.

**Why:** Keeping the state machine in the service layer prevents the three views from developing conflicting rules. It also preserves atomic assignment behavior and ensures invalid confirmation codes or out-of-order transitions do not corrupt delivery state.

**Cost accepted:** The frontend cannot provide authoritative validation before the request reaches the backend, so it must handle and display API errors clearly.

## Lightweight Shared CSS

**Decision:** Use one plain CSS file with shared tokens, responsive rules, and no frontend framework or heavy dependency.

**Why:** The product is a simple delivery management tool with three focused views. A small shared stylesheet keeps the visual language consistent and makes responsive behavior easy to inspect and adjust.

**Cost accepted:** The project does not gain a full design-system component library or framework-level layout primitives. Repeated UI patterns remain intentionally simple and close to their owning page.
