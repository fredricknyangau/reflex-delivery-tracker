# Database Design Trade-offs

## Trade-off 1: Polling vs. Real-Time Push

**Decision:** Use polling (client refreshes every few seconds) instead of WebSockets/real-time push.

**Why Chosen:**
- WebSockets require additional infrastructure (message queue, pub/sub service)
- Polling is simpler to test and debug
- Reflex scope is delivery status, not chat; sub-second latency isn't critical

**Acceptable Because:**
- A dispatcher refreshing every 5 seconds still gets fresh visibility of new requests
- A rider seeing their assignments update in 5 seconds is acceptable for delivery use case
- Cost: Slight delay in status propagation, minor increase in database load from frequent reads

**If We Had More Time:**
- Implement WebSocket layer with message queue (Redis) for true real-time
- Add exponential backoff polling (slower refresh when no changes)

---

## Trade-off 2: Denormalize Current Status

**Decision:** Store `status` on `delivery_requests` table instead of always deriving it from `delivery_status_history`.

**Why Chosen:**
- Dashboard queries (e.g., "show me all PICKED_UP requests") are read-heavy
- Deriving status from history requires expensive JOIN and MAX(timestamp) query
- Denormalization gives us O(1) lookups on status

**Acceptable Because:**
- `delivery_status_history` is the source of truth for audit
- Application logic keeps `status` and history in sync (transactional update)
- Cost: Slight risk of drift if sync logic breaks; mitigated by test coverage

**If We Had More Time:**
- Add database-level trigger to auto-sync status from history (higher confidence)
- Create repair function to reconcile drift if it occurs

---

## Trade-off 3: No DB-Level Permission Enforcement

**Decision:** No complex access control in the database layer; FastAPI middleware enforces role-based access.

**Why Chosen:**
- This is a single-team system (one retailer's dispatchers and riders)
- Adding row-level security (RLS) policies adds complexity without clear benefit
- Application-level checks are clearer to test and audit

**Acceptable Because:**
- Explicit (enforced by app logic) is easier to understand than implicit (enforced by DB)
- We name it as a trade-off; not an oversight
- Cost: If someone bypasses the API, they could see other retailers' data; acceptable for MVP

**If We Had More Time:**
- Implement PostgreSQL RLS policies to make data access hard-coded at DB level
- Add audit logging of all data access (who queried what, when)

---

## Trade-off 4: Confirmation Code as Text, Not External QR Service

**Decision:** Generate a simple alphanumeric confirmation code (stored on `delivery_requests`) instead of integrating with external QR generation service or hardware scanner.

**Why Chosen:**
- No external service dependency
- Riders can enter code manually or scan text-based QR (same info)
- Matches pattern proven on Meridian Pivot (`print_job_id` correlation)

**Acceptable Because:**
- Text input is sufficient for MVP
- Can scale to full QR infrastructure later
- Cost: Slightly more manual, but acceptable for Kenyan delivery use case

**If We Had More Time:**
- Integrate QR code generation library
- Add barcode scanner hardware support
- Add photo proof-of-delivery (rider takes photo at delivery location)

---

## Summary

All four trade-offs are **named explicitly and defensible**. Each prioritizes **simplicity and speed of delivery** over optional sophistication, which is the correct call for a 4-day sprint.