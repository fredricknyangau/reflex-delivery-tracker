# Reflex - Frontend Mockups & Responsive Reference Specification

## 1. Overview & Responsive Philosophy

The Reflex frontend is built using a **mobile-first, responsive design architecture**. It guarantees full usability and high visual clarity across all target device categories:
*   **Mobile Viewports:** 320px, 375px, 390px, 430px (e.g., iPhone SE, iPhone 13/14/15, Pixel 7, Galaxy S22)
*   **Tablet Viewports:** 768px, 820px, 1024px (e.g., iPad Mini, iPad Air, Galaxy Tab)
*   **Desktop Viewports:** 1280px, 1440px+ (Laptops, Standard Desktops, Large Monitors)

---

## 2. Layout Specifications by Persona

### 2.1. Landing & Role Selector Page (`index.html`)

#### Wireframe
```
┌────────────────────────────────────────────────────────┐
│                        Reflex                          │
│           Select a Persona to Start Demo               │
│                                                        │
│             [ ● API Connected / Sandbox ]              │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ◯ Retailer Staff                                 │  │
│  │   Creates and tracks delivery requests           │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ ◯ Dispatcher                                     │  │
│  │   Assigns riders to requested deliveries         │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ ◯ Rider                                          │  │
│  │   Picks up and delivers orders with codes        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Select Active User Profile:                           │
│  [ Dropdown: Alice Wambui (QuickMart CBD)        ▼ ]   │
│                                                        │
│  [             Proceed to Interface                ]   │
└────────────────────────────────────────────────────────┘
```

#### Responsive Behavior
*   **Mobile (320px–430px):** Single-column centered container with `padding: 0.75rem`. Cards stretch to `100%` width with minimum 44px touch targets on role options and proceed button.
*   **Tablet (768px–1024px):** Centered card bounded at `max-width: 460px` with comfortable vertical margins (`2.5rem auto`).
*   **Desktop (1280px+):** Centered card with subtle drop-shadow and refined typography.

---

### 2.2. Retailer Dashboard (`retailer/index.html`)

#### Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Reflex  Retailer Dashboard        [ ● API Connected ]  [ Retailer: Alice ] [ Back ]     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Alert: Delivery request created successfully ]                                        │
│                                                                                         │
│ ┌──────────────────────────────────────┐  ┌──────────────────────────────────────────┐  │
│ │ Create Delivery Request              │  │ My Delivery Requests        [ Refresh ]  │  │
│ ├──────────────────────────────────────┤  ├──────────────────────────────────────────┤  │
│ │ Customer Name *                      │  │ ID   Item       Customer  Status  Action │  │
│ │ [ Margaret Nduta                   ] │  │ #101 CookingOil M. Nduta  [REQ]   [Hist] │  │
│ │ Customer Phone *                     │  │ #102 Soap Bars  J. Juma   [ASS]   [Hist] │  │
│ │ [ 0700112233                       ] │  │ #103 MaizeFlour D. Otieno [DEL]   [Hist] │  │
│ │ Delivery Address *                   │  │                                          │  │
│ │ [ Ngong Road, Suite 4B             ] │  │                                          │  │
│ │ Item Description *                   │  │                                          │  │
│ │ [ Carton of Cooking Oil (12L)      ] │  │                                          │  │
│ │                                      │  │                                          │  │
│ │ [       Submit Request             ] │  │                                          │  │
│ └──────────────────────────────────────┘  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Responsive Behavior
*   **Mobile (320px–430px):** 
    *   Header wraps gracefully into two rows: Logo on top, user badge and back button below with full touch spacing.
    *   Grid stacks vertically: Form appears first, followed by the Delivery Requests container.
    *   Table is wrapped in a horizontal scroll container (`-webkit-overflow-scrolling: touch`) with a `min-width: 580px` table base so columns remain legible without text crushing.
*   **Tablet (768px–1024px):** Stacks in single column or adaptive 2-column with form on left (`minmax(280px, 0.9fr)`) and requests on right (`1.5fr`).
*   **Desktop (1280px+):** Two-column side-by-side grid (`grid-template-columns: minmax(320px, 0.85fr) minmax(0, 1.75fr)`).

---

### 2.3. Dispatcher Dashboard (`dispatcher/index.html`)

#### Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Reflex  Dispatcher Dashboard      [ ● API Connected ]  [ Dispatcher: Bob ] [ Back ]     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Open Requests (Waiting for Rider)                                       [ Refresh ] │ │
│ ├─────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ ID   Item         Customer    Address              Logged At    Action              │ │
│ │ #101 Cooking Oil  M. Nduta    Ngong Road, Suite 4B 10:30 AM     [ Assign Rider ]    │ │
│ └─────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ All Deliveries Tracking                                                             │ │
│ ├─────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ ID   Item         Customer    Status        Rider           Updated At  History     │ │
│ │ #102 Soap Bars    J. Juma     [ASSIGNED]    Charlie Kamau   11:00 AM    [ History ] │ │
│ │ #100 Rice (25kg)  K. Karanja  [DELIVERED]   Frank Ochieng   09:15 AM    [ History ] │ │
│ └─────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Responsive Behavior
*   **Mobile (320px–430px):**
    *   Header buttons and badge stack with full-width action buttons.
    *   Both open requests and all tracking tables are nested in dedicated responsive scroll wrappers with minimum widths, preventing horizontal page overflow.
    *   Assign Rider modal adapts to 95vw with full-width dropdown and confirmation buttons.
*   **Tablet & Desktop (768px+):** Full-width tables with clear spacing, formatted badges, and interactive modals.

---

### 2.4. Rider Dashboard (`rider/index.html`)

#### Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Reflex  Rider Dashboard           [ ● API Connected ]  [ Rider: Charlie ] [ Back ]      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ My Assigned Deliveries                                                    [ Refresh ]   │
│                                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ JOB #102                                                        [ PICKED UP ]       │ │
│ │ Box of Soap Bars                                                                    │ │
│ │                                                                                     │ │
│ │ PICKUP FROM (RETAILER): QuickMart CBD, Moi Avenue, Nairobi (0711222333)             │ │
│ │ DELIVER TO (CUSTOMER):  James Juma (0722998877), Biashara Street, Block C           │ │
│ │                                                                                     │ │
│ │ [ View History ]                                                                    │ │
│ │                                                                                     │ │
│ │ ┌ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┐   │ │
│ │   CONFIRMATION CODE (Give to customer):   RX-584712                             │   │ │
│ │   Verify Customer Code at Site:           [ Enter code e.g. RX-584712         ] │   │ │
│ │   [                          Confirm Delivery                                 ] │   │ │
│ │ └ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┘   │ │
│ └─────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Responsive Behavior
*   **Mobile (320px–430px):**
    *   Job cards are single-column card blocks optimized for smartphone handling in the field.
    *   Addresses and phone numbers have high contrast and large font size for readability in bright sunlight.
    *   Confirmation code is rendered in bold monospace text (`font-size: 1.35rem`).
    *   Input field and Confirm Delivery button stretch to 100% width with min-height 48px for easy thumb tapping.
*   **Tablet & Desktop (768px+):** Clean card feed bounded inside container with refined spacing.

---

## 3. Responsive Breakpoint Strategy

```
+--------------------------------------------------------------------------------+
| Viewport Width     | Layout Structure & Adjustments                            |
+--------------------+-----------------------------------------------------------+
| < 480px (Mobile)   | • 1-column layout for all sections                        |
|                    | • Container padding: 0.65rem - 0.75rem                    |
|                    | • Header elements wrap into stacked rows                  |
|                    | • Form inputs: font-size 16px (no iOS auto-zoom)          |
|                    | • Tables: Horizontal scrolling with min-width: 580px       |
|                    | • Modal dialogs: 94vw width, margin auto                  |
|                    | • Touch targets: Minimum 44px height                      |
+--------------------+-----------------------------------------------------------+
| 481px - 767px      | • 1-column layout with expanded padding                   |
| (Large Mobile)     | • Tables scroll smoothly                                  |
|                    | • Cards maintain consistent border-radius                 |
+--------------------+-----------------------------------------------------------+
| 768px - 1023px     | • 2-column layout for Retailer (Form + Requests)          |
| (Tablet)           | • Container max-width: 740px - 960px                      |
|                    | • Header is single row with inline badges                 |
+--------------------+-----------------------------------------------------------+
| 1024px - 1440px+   | • Full 2-column desktop layout                            |
| (Desktop)          | • Container max-width: 1040px                             |
|                    | • Side-by-side management with full visual breathing room |
+--------------------+-----------------------------------------------------------+
```
