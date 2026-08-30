# Defense Framework Guide

## State → Context → Evidence

**Purpose:** For every hard question during cross-exam, answer in this exact order. Do not explain your reasoning before stating your answer, panels lose patience with a wandering lead-up.

---

## The Structure

1. **State** - your answer, plainly, in one sentence. No hedging, no "well, it depends."
2. **Context** - the reasoning behind it, why you made that call.
3. **Evidence** - a concrete detail: a number, a test result, a specific decision, something from our actual docs, not a general claim.

If you genuinely don't know: say **"I don't know, but here's how I'd find out"** - state that plainly too, then give a real method, not a vague gesture. This scores higher than a bluffed guess, per the rubric.

---

## Worked Examples From Our Own Project

### Example 1 - Architecture Question

**Q: "Why polling instead of WebSockets?"**

- **State:** "We chose polling deliberately, not because we didn't consider WebSockets."
- **Context:** "WebSockets are the technically correct answer for true real-time updates, but they add real implementation and testing risk. We had a 4-day build window and prioritized finishing a simpler mechanism correctly over partially finishing a more advanced one."
- **Evidence:** "This is documented as Trade-off 1 in our trade-off log, with the accepted cost being a few seconds of update delay, and our roadmap names WebSockets as the next step with more time."

### Example 2 - Edge Case Question

**Q: "What happens if two dispatchers try to assign the same delivery at the same time?"**

- **State:** "Only one assignment succeeds, the second is rejected cleanly."
- **Context:** "We use a single atomic conditional UPDATE, `WHERE status = 'Requested'`, so the database itself resolves the race, not application code."
- **Evidence:** "We specifically tested this, and it's documented in our architecture doc's failure boundaries section. This is the same pattern we already proved working in a prior sprint's check-in kiosk project."

### Example 3 - Trade-off Question

**Q: "What's the weakest part of your design?"**

- **State:** "Probably that there's no reassignment flow if a rider becomes unavailable after being assigned."
- **Context:** "We chose to make the core forward-moving state machine fully correct and tested rather than add a lateral transition that increases the surface area of what needs to be right, under our timeline."
- **Evidence:** "It's named directly as Trade-off 4 in our log, with a proposed fix: a tracked Reassign action that preserves the audit trail rather than overwriting it."

### Example 4 - Candor Question (No Clean Answer)

**Q: "What happens if your process crashes between the database write and the queue publish?"** _(if asked about the Meridian Pivot project, or an equivalent question about Reflex's own failure modes)_

- **State:** "I don't know exactly what state that leaves things in without checking, but here's how I'd find out."
- **Context:** "We use a compensating rollback for this exact boundary, if the publish fails after the DB commits, we reset the state. But a genuine mid-process crash, not just a caught exception, is a scenario we documented as a known limitation, not something we fully tested."
- **Evidence:** "It's named explicitly in our known limitations section. The correct production fix is a transactional outbox pattern, which we scoped out given the timeline, and I'd verify current behavior by deliberately killing the process at that exact point and inspecting the database state."

---

## Practice Drill

Before the mock panel, each person should practice answering out loud, not just silently reading, at least 3 questions from the question bank using this structure. Speaking it changes how naturally it comes out under real pressure.
