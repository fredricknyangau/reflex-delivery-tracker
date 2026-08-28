# Reflex - Workflow & User Journey

## Week 3 - The Readiness Sprint

**Status:** Draft, expands `PROBLEM_AND_DESIGN.md` Part 2.5
**Owner:** Maria (persona experience), refined by Ibrahim from Thursday

---

## 1. Purpose

This document walks through the complete lifecycle of a single delivery, from the moment a retailer logs a request to the moment it's confirmed delivered, showing exactly what each of the three personas sees and does at every stage. It should be readable end to end by someone who has never seen the codebase, this is the document a non-technical panel member should be able to follow without translation.

---

## 2. The Full Journey, Step by Step

# Demo Script

## Setup (before presenting)

* [ ] Backend running
* [ ] Frontend open in browser with 3 tabs/windows: Retailer, Dispatcher, Rider views
* [ ] Fresh seed data confirmed
* [ ] Test retailer, dispatcher, and rider accounts ready
* [ ] Browser/network connection confirmed
* [ ] Delivery request test details prepared

## Script

### **[0:00] Retailer creates a request**

**Action:**

* Switch to the **Retailer** view.
* Open **Create Delivery Request**.
* Enter:

  * Customer name
  * Customer phone
  * Delivery address
  * Item description
* Click **Submit**.

**Expected:**

* A new delivery request appears under **My Requests**.
* Status is **Requested**.

---

### **[0:30] Dispatcher sees the request**

**Action:**

* Switch to the **Dispatcher** view.
* Locate the newly created request.
* Confirm that it appears with status **Requested**.

**Expected:**

* The request is visible in the dispatcher's open requests list.

---

### **[0:50] Dispatcher assigns a rider**

**Action:**

* Select the delivery request.
* Select an available rider.
* Click **Assign**.

**Expected:**

* Status changes from **Requested** to **Assigned**.
* The assigned rider is displayed.
* The request will become visible in that rider's delivery list.

**Action:**

* Switch to the **Retailer** view.
* Refresh or wait for the next poll.

**Expected:**

* The retailer now sees **Assigned**.

---

### **[1:20] Rider receives the delivery**

**Action:**

* Switch to the **Rider** view.
* Locate the assigned delivery.

**Expected:**

* The delivery appears under **My Deliveries**.
* Status is **Assigned**.

---

### **[1:45] Rider marks the item as Picked Up**

**Action:**

* Click **Mark Picked Up**.

**Expected:**

* Status changes from **Assigned** to **Picked Up**.
* A confirmation code is generated and displayed.
* The rider can see the confirmation code, either as text or as a QR code if the interface renders it.

**Action:**

* Note or display the generated confirmation code.

---

### **[2:10] Retailer sees the pickup**

**Action:**

* Switch to the **Retailer** view.
* Refresh or wait for the next poll.

**Expected:**

* Status changes to **Picked Up**.

---

### **[2:25] Rider confirms the delivery**

**Action:**

* Return to the **Rider** view.
* Open the delivery.
* Enter or scan the confirmation code.
* Click **Mark Delivered**.

**Expected:**

* The system verifies that:

  1. The current status is **Picked Up**.
  2. The submitted confirmation code matches the stored code.
* Status changes from **Picked Up** to **Delivered**.

---

### **[2:55] Retailer sees the completed delivery**

**Action:**

* Switch to the **Retailer** view.
* Refresh or wait for the next poll.

**Expected:**

* Status displays **Delivered**.

---

### **[3:10] Show the complete status history**

**Action:**

* Open the request's **status history**.
* Show the recorded events.

**Expected:**

```text
Requested   → 09:12, by [staff name]
Assigned    → 09:20, by [dispatcher name], to [rider name]
Picked Up   → 09:45, by [rider name]
Delivered   → 10:15, by [rider name]
```
---

### **[3:40] Close**

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
