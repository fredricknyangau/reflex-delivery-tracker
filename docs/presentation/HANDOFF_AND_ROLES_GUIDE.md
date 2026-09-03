# Presentation Handoff & Roles Guide

**Purpose:** Per the brief, "rehearse the handoffs, not just the content." A team that trips over who's talking loses points on Delivery & Presence even with a strong build.

---

## 1. Slide Ownership
| Slide | Presenter | Reasoning |
|---|---|---|
| Problem | Fredrick | Wrote the original problem decomposition, owns the framing |
| Solution | Fredrick | Direct continuation of Problem |
| Architecture | Stephen/Fredrick | Built the actual state machine, can speak to it concretely |
| Trade-offs | Ibrahim | Owns the trade-off log, reviewed it with fresh eyes |
| Roadmap | Ibrahim | Whoever hasn't presented yet, spreads speaking time evenly |
| Live Demo | Maria | (frontend) driving, Stephen narrating backend behavior | Demo needs one driver, one narrator, not everyone touching the keyboard |


## 2. First-Question Ownership by Topic

Per the brief: "decide who takes the first question on which topic." This prevents the awkward silence where everyone looks at everyone else.

| Topic | First Responder | Backup |
|---|---|---|
| Database/schema questions | Mark | Fredrick |
| Backend/API/state machine questions | Stephen | Fredrick |
| Frontend/UX questions | Maria | Stephen |
| Trade-offs/roadmap questions | Ibrahim | Fredrick |
| "Why this over the alternative" architecture questions | Fredrick | Stephen |

**The first responder isn't the only one allowed to answer**, if they get stuck or want backup, anyone can jump in. This just avoids the dead-air moment.

## 3. Rotation Rule (Per the Brief)

**Every member must field at least one live, unscripted question.** Don't let the most confident speaker absorb all of cross-exam, this is explicitly watched for in scoring (Delivery & Presence: "handoffs between presenters" being invisible, not stiff).

## 4. Handoff Phrases (Rehearse These, Not Just the Content)

A clean handoff sounds intentional, not stiff. Practice actual transition lines:

- "I'll hand it to Stephen to walk through how that's actually enforced in the backend."
- "Mark can speak to exactly why we structured the schema that way."
- "That's a good one for Ibrahim, since he reviewed our trade-offs directly."

**Do not** just stop talking and look at someone, say their name and the topic, out loud, as part of your sentence.

## 5. Timing Discipline

Per the rubric: "hits time exactly" is a top-tier signal. Assign a strict time budget per slide (see `TIMING_LOG.md`), and designate one person (not currently presenting) to give a silent time signal (a hand raise, a phone timer visible) if a segment is running long during rehearsal.

## 6. What to Rehearse, Specifically

- [ ] Full run-through, timed, twice minimum (per deliverables checklist)
- [ ] At least 3 handoff transitions spoken out loud, not just planned on paper
- [ ] Everyone answers at least one question cold, without knowing it's coming, during rehearsal
- [ ] The live demo, run at least once by the actual presenter, not just described
