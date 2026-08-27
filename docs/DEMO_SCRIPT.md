# Reflex - Demo Narrative Script

This script walks through the complete delivery lifecycle live in the browser, showing the role transitions and coordination.

---

## Preparation
1.  Open the Reflex index page (`frontend/index.html`) in a browser.
2.  Clear local storage or open in an Incognito window to start with a fresh sandbox state.
3.  Observe the status indicator in the top header. If the FastAPI backend is running, it will show **API Connected**; otherwise, it will show **Sandbox Sandbox Mode (Offline Fallback)**. Both modes execute the exact same state machine rules.

---

## Step 1: Landing Page Setup
*   **Action:** Highlight the three role options: **Retailer Staff**, **Dispatcher**, and **Rider**.
*   **Speech:** *"Reflex is built around three personas: the Retailer who originates the request, the Dispatcher who manually assigns responsibility, and the Rider who executes the physical delivery. We've built a sandbox login selector to let us toggle between these roles for our live demo."*
*   **Action:** Select **Retailer Staff** -> Select **Alice Wambui** -> Click **Proceed to Interface**.

---

## Step 2: Creating a Request (Retailer Staff)
*   **Action:** Fill in the "Create Delivery Request" form:
    *   **Customer Name:** Margaret Nduta
    *   **Customer Phone:** 0700112233
    *   **Delivery Address:** Ngong Road, Suite 4B
    *   **Item Description:** Carton of Cooking Oil (12L)
*   **Action:** Click **Submit Request**. Verify that a success alert appears, the form resets, and the request appears under "My Delivery Requests" with the status **Requested** and Rider as **Unassigned**.
*   **Speech:** *"Alice Wambui logs a new order. It is recorded immediately. The request is in the Requested status, and has no assigned rider. Notice that Alice can click the 'History' button to see the audit trail, which currently shows a single entry: 'Requested' by Alice at the current timestamp."*
*   **Action:** Click **Back to Selector** (logout).

---

## Step 3: Assignment (Dispatcher)
*   **Action:** Select **Dispatcher** -> Select **Bob Mwangi** -> Click **Proceed to Interface**.
*   **Action:** Verify the new request appears under **Open Requests (Waiting for Rider)**.
*   **Action:** Click **Assign Rider** for Margaret's request. In the modal, select **Charlie Kamau** from the dropdown, and click **Confirm Assignment**.
*   **Action:** Notice that the request disappears from the "Open Requests" table and appears in the "All Deliveries Tracking" table with the status **Assigned** and Rider as **Charlie Kamau**.
*   **Speech:** *"Bob Mwangi logs in as the Dispatcher. He sees the open request waiting for action. Bob opens the assignment modal and selects Charlie Kamau as the rider. The system performs an atomic check to assign Charlie. If another dispatcher had assigned this order at the same moment, the system would reject Bob's action with a user-friendly 'Already assigned' message."*
*   **Action:** Click **Back to Selector** (logout).

---

## Step 4: Physical Custody (Rider - Pickup)
*   **Action:** Select **Rider** -> Select **Charlie Kamau** -> Click **Proceed to Interface**.
*   **Action:** Verify the request appears under **My Assigned Deliveries** in the **Assigned** state.
*   **Action:** Click **Mark Picked Up**.
*   **Action:** Notice the card transitions to the **Picked Up** state, and a large **CONFIRMATION CODE** (e.g. `RX-584712`) is generated and displayed.
*   **Speech:** *"Charlie Kamau opens his Rider dashboard. He only sees deliveries assigned to him. When he physically collects the cooking oil from the retail warehouse, he taps 'Mark Picked Up'. The system advances the state and generates an authoritative confirmation code. Charlie will give this code to the customer upon arrival at the delivery site."*
*   **Action:** Keep this window open, or copy the confirmation code. In another browser tab (or after logging out), return to **Retailer Staff (Alice)**.

---

## Step 5: Proof of Delivery / Real-Time Polling (Retailer Audit)
*   **Action:** (Optional) If running in a separate tab, point out that Alice's list updated automatically without manual refresh due to the polling script.
*   **Action:** Click **History** for the request.
*   **Action:** Show the timeline containing three distinct entries:
    1.  `Requested` by Alice Wambui (retailer_staff)
    2.  `Assigned` by Bob Mwangi (dispatcher) to Charlie Kamau
    3.  `Picked Up` by Charlie Kamau (rider)
*   **Speech:** *"Back in the Retailer view, we see that the status has updated to Picked Up. By opening the History timeline, we have instant visibility into physical custody: we know exactly who logged it, who assigned it, and that Charlie Kamau currently has physical possession of the items."*

---

## Step 6: Complete Delivery (Rider - Delivery)
*   **Action:** Switch back to **Rider (Charlie Kamau)**.
*   **Action:** Scroll to the confirmation code input field. Enter an incorrect code (e.g. `RX-000000`) and click **Confirm Delivery**.
*   **Action:** Observe the red error alert: **"Invalid confirmation code. Please check and try again."** and notice the status remains **Picked Up**.
*   **Speech:** *"At the customer's site, Charlie must verify the transaction. If he tries to mark it delivered with an incorrect code, the system rejects the transition. The delivery remains Picked Up. This prevents riders from claiming a delivery was completed without visiting the customer."*
*   **Action:** Now enter the **correct** confirmation code displayed on Charlie's card, and click **Confirm Delivery**.
*   **Action:** Verify that a success alert appears, and the status transitions to **Delivered**.
*   **Speech:** *"Once Charlie enters the correct code provided by the customer, the validation succeeds. The state transitions to Delivered, which is the final state of our lifecycle."*

---

## Step 7: Verification (Retailer / Dispatcher)
*   **Action:** Log in as **Retailer Staff (Alice)** or **Dispatcher (Bob)**.
*   **Action:** Open the request's **History** modal and observe the final `Delivered` event.
*   **Speech:** *"Finally, both the Retailer and the Dispatcher can confirm the delivery is complete. The permanent audit trail now lists the exact timestamp and actor who marked it Delivered, resolving our coordination and visibility gap completely."*
