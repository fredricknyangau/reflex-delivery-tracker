# Mock Panel Question Bank

**Purpose:** Practice answering these using State → Context → Evidence before the real mock panel. Drawn from all four categories the brief says the panel will use.

---

## Architecture - "Why this choice over the obvious alternative?"

1. Why raw SQL instead of an ORM?
2. Why a single `users` table with a role column, instead of separate tables for retailer_staff, dispatcher, and rider?
3. Why does the confirmation code get generated at Pickup rather than at request creation?
4. Why is the state machine logic in the service layer instead of in the database, or instead of in the frontend?
5. Why FastAPI over another framework?
6. Why is a dispatcher scoped to one retailer instead of serving multiple retailers?

## Trade-offs - "What did you simplify, and what's the cost?"

1. What's the cost of choosing polling over real-time push?
2. What's the cost of manual rider assignment instead of automatic routing?
3. What happens to a retailer with no dedicated dispatcher, given your per-retailer scoping?
4. What's missing because you didn't build a reassignment flow?
5. If you had one more day, what would you build first, and why that over the other options?

## Edge Cases - "What happens when two things happen at once, or something fails partway through?"

1. Two dispatchers try to assign the same delivery simultaneously, what happens?
2. A rider tries to mark something Delivered without marking it Picked Up first, what happens?
3. What if the wrong confirmation code is submitted at delivery?
4. What happens if a rider's device loses connection mid-poll?
5. Can a request skip states entirely, e.g., go straight from Requested to Delivered? Why or why not?
6. What happens if a retailer tries to view another retailer's delivery requests?

## Candor - Questions With No Clean Answer

1. What haven't you tested that you're not fully confident about?
2. If this had to support 10x the current volume tomorrow, what would break first?
3. What would a security review find wrong with this system as it stands?
4. Is there anything in your design you'd genuinely reconsider if you started over?
5. What's the one part of this system you're least confident explaining right now?

---

## How to Use This Bank

1. Each team member picks 3-4 questions from categories they're likely to field (per the Handoff guide's topic assignments).
2. Practice answering out loud using State → Context → Evidence, don't just think through it silently.
3. During the mock panel, someone should pull unscripted questions from this bank that the presenter hasn't specifically prepared, this is where genuine composure gets tested, not just rehearsed answers.
4. For the Candor questions specifically, practice saying "I don't know, but here's how I'd find out" out loud, at least once each, per the brief this scores higher than bluffing.
