/* 
 * Reflex - Delivery Tracker API Client
 * Centralized API calls using fetch().
 * 
 * DESIGN PRINCIPLE: 
 * - Standard HTTP request signatures to integrate directly with FastAPI.
 * - Automatic Sandbox Fallback: If the server is offline or endpoints return 404/501,
 *   the client transparently falls back to an in-memory mock store that mimics
 *   the database constraints and state machine transitions.
 */

const API_BASE_URL = 'http://localhost:8000';

// Global state to track connection mode (useful for UI indicator)
let isUsingSandbox = false;

// IN-MEMORY SANDBOX STATE (Used when backend is offline/not implemented)
const sandboxDb = {
  retailers: [
    { id: 1, business_name: "QuickMart CBD", phone: "0711222333", address: "Moi Avenue, Nairobi" },
    { id: 2, business_name: "Naivas Westlands", phone: "0722333444", address: "Westlands Mall, Nairobi" },
    { id: 3, business_name: "Kibera Retailers", phone: "0733444555", address: "Kibera Drive, Nairobi" }
  ],
  users: [
    // Retailer 1
    { id: 1, retailer_id: 1, name: "Alice Wambui", phone: "0788111222", role: "retailer_staff" },
    { id: 2, retailer_id: 1, name: "Bob Mwangi", phone: "0788222333", role: "dispatcher" },
    { id: 3, retailer_id: 1, name: "Charlie Kamau", phone: "0788333444", role: "rider" },
    // Retailer 2
    { id: 4, retailer_id: 2, name: "David Onyango", phone: "0788444555", role: "retailer_staff" },
    { id: 5, retailer_id: 2, name: "Emily Cherono", phone: "0788555666", role: "dispatcher" },
    { id: 6, retailer_id: 2, name: "Frank Ochieng", phone: "0788666777", role: "rider" },
    // Retailer 3
    { id: 7, retailer_id: 3, name: "George Njoroge", phone: "0788777888", role: "retailer_staff" },
    { id: 8, retailer_id: 3, name: "Halima Ibrahim", phone: "0788888999", role: "dispatcher" },
    { id: 9, retailer_id: 3, name: "Ian Kiprop", phone: "0788999000", role: "rider" }
  ],
  delivery_requests: [],
  status_events: []
};

// Initialize some starter mock requests if localStorage sandbox is empty
function initSandbox() {
  const storedRequests = localStorage.getItem('reflex_sandbox_requests');
  const storedEvents = localStorage.getItem('reflex_sandbox_events');
  
  if (storedRequests) {
    sandboxDb.delivery_requests = JSON.parse(storedRequests);
  } else {
    // Generate some starter requests
    sandboxDb.delivery_requests = [
      {
        id: 101,
        retailer_id: 1,
        created_by: 1,
        customer_name: "Margaret Nduta",
        customer_phone: "0700112233",
        address: "Ngong Road, Suite 4B",
        item_description: "Carton of Cooking Oil (12L)",
        status: "Requested",
        assigned_rider_id: null,
        confirmation_code: null,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 102,
        retailer_id: 1,
        created_by: 1,
        customer_name: "James Juma",
        customer_phone: "0722998877",
        address: "Biashara Street, Block C",
        item_description: "Box of Soap Bars",
        status: "Assigned",
        assigned_rider_id: 3,
        confirmation_code: null,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        updated_at: new Date(Date.now() - 5400000).toISOString()
      }
    ];
    saveSandboxToStorage();
  }

  if (storedEvents) {
    sandboxDb.status_events = JSON.parse(storedEvents);
  } else {
    sandboxDb.status_events = [
      { id: 1, delivery_request_id: 101, status: "Requested", changed_by: 1, changed_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 2, delivery_request_id: 102, status: "Requested", changed_by: 1, changed_at: new Date(Date.now() - 7200000).toISOString() },
      { id: 3, delivery_request_id: 102, status: "Assigned", changed_by: 2, changed_at: new Date(Date.now() - 5400000).toISOString() }
    ];
    saveSandboxToStorage();
  }
}

function saveSandboxToStorage() {
  localStorage.setItem('reflex_sandbox_requests', JSON.stringify(sandboxDb.delivery_requests));
  localStorage.setItem('reflex_sandbox_events', JSON.stringify(sandboxDb.status_events));
}

initSandbox();

// Helper to check if API is responsive
async function checkBackendOnline() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    const response = await fetch(`${API_BASE_URL}/requests`, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    isUsingSandbox = false;
    return true;
  } catch (e) {
    isUsingSandbox = true;
    console.warn("Backend API is offline or unreachable. Falling back to frontend Sandbox mode.");
    return false;
  }
}

// Visual state indicator helper
function updateStatusIndicator() {
  const container = document.getElementById('connection-status-container');
  if (!container) return;
  
  if (isUsingSandbox) {
    container.innerHTML = `
      <div class="user-badge" style="background-color: #fef3c7; border-color: #f59e0b; color: #b45309;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:#d97706; margin-right:4px;"></span>
        Sandbox Sandbox Mode (Offline Fallback)
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="user-badge" style="background-color: #dcfce7; border-color: #10b981; color: #15803d;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:#10b981; margin-right:4px;"></span>
        API Connected
      </div>
    `;
  }
}

/* ==========================================
 * API OPERATIONS
 * ========================================== */

// 1. GET /retailers
async function apiFetchRetailers() {
  const online = await checkBackendOnline();
  updateStatusIndicator();
  
  if (online) {
    try {
      const res = await fetch(`${API_BASE_URL}/retailers`);
      if (res.ok) return await res.json();
      if (res.status === 404) throw new Error("Not implemented");
    } catch (e) {
      console.warn("Endpoint GET /retailers failed, using Sandbox fallback.");
    }
  }
  return sandboxDb.retailers;
}

// 2. GET /users
async function apiFetchUsers(role = null, retailerId = null) {
  const online = await checkBackendOnline();
  updateStatusIndicator();

  if (online) {
    try {
      let url = `${API_BASE_URL}/users?`;
      if (role) url += `role=${role}&`;
      if (retailerId) url += `retailer_id=${retailerId}&`;
      
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Endpoint GET /users failed, using Sandbox fallback.");
    }
  }

  // Sandbox fallback
  let filtered = [...sandboxDb.users];
  if (role) filtered = filtered.filter(u => u.role === role);
  if (retailerId) filtered = filtered.filter(u => u.retailer_id == retailerId);
  return filtered;
}

// 3. POST /requests
async function apiCreateDeliveryRequest(data) {
  const online = await checkBackendOnline();
  updateStatusIndicator();

  if (online) {
    try {
      const res = await fetch(`${API_BASE_URL}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.detail || "Failed to create request.");
    } catch (e) {
      if (e.message !== "Failed to create request." && !isUsingSandbox) {
        throw e;
      }
      console.warn("Endpoint POST /requests failed, using Sandbox fallback.");
    }
  }

  // Sandbox fallback
  const newRequest = {
    id: sandboxDb.delivery_requests.length > 0 ? Math.max(...sandboxDb.delivery_requests.map(r => r.id)) + 1 : 101,
    retailer_id: Number(data.retailer_id),
    created_by: Number(data.created_by),
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    address: data.address,
    item_description: data.item_description,
    status: "Requested",
    assigned_rider_id: null,
    confirmation_code: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  sandboxDb.delivery_requests.push(newRequest);
  
  // Status events logging
  const newEvent = {
    id: sandboxDb.status_events.length > 0 ? Math.max(...sandboxDb.status_events.map(e => e.id)) + 1 : 1,
    delivery_request_id: newRequest.id,
    status: "Requested",
    changed_by: Number(data.created_by),
    changed_at: new Date().toISOString()
  };
  sandboxDb.status_events.push(newEvent);

  saveSandboxToStorage();
  return newRequest;
}

// 4. GET /requests (Filters: retailer_id, status, assigned_to)
async function apiFetchRequests(filters = {}) {
  const online = await checkBackendOnline();
  updateStatusIndicator();

  if (online) {
    try {
      let query = new URLSearchParams();
      if (filters.retailer_id) query.append('retailer_id', filters.retailer_id);
      if (filters.status) query.append('status', filters.status);
      if (filters.assigned_to) query.append('assigned_to', filters.assigned_to);

      const res = await fetch(`${API_BASE_URL}/requests?${query.toString()}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Endpoint GET /requests failed, using Sandbox fallback.");
    }
  }

  // Sandbox fallback
  let filtered = [...sandboxDb.delivery_requests];
  if (filters.retailer_id) {
    filtered = filtered.filter(r => r.retailer_id == filters.retailer_id);
  }
  if (filters.status) {
    filtered = filtered.filter(r => r.status === filters.status);
  }
  if (filters.assigned_to) {
    filtered = filtered.filter(r => r.assigned_rider_id == filters.assigned_to);
  }
  return filtered;
}

// 5. POST /requests/{id}/assign
async function apiAssignRider(id, riderId, dispatcherUserId) {
  const online = await checkBackendOnline();
  updateStatusIndicator();

  if (online) {
    try {
      const res = await fetch(`${API_BASE_URL}/requests/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_rider_id: Number(riderId), changed_by: Number(dispatcherUserId) })
      });
      if (res.ok) return await res.json();
      
      const err = await res.json();
      throw new Error(err.detail || "Unable to assign request.");
    } catch (e) {
      if (e.message !== "Unable to assign request." && !isUsingSandbox) {
        throw e;
      }
      console.warn("Endpoint POST /requests/{id}/assign failed, using Sandbox fallback.");
    }
  }

  // Sandbox fallback (Atomic check simulation)
  const reqIndex = sandboxDb.delivery_requests.findIndex(r => r.id == id);
  if (reqIndex === -1) {
    throw new Error("Request not found.");
  }
  
  const req = sandboxDb.delivery_requests[reqIndex];
  
  // State check: Must be 'Requested'
  if (req.status !== 'Requested') {
    const assignedRider = sandboxDb.users.find(u => u.id == req.assigned_rider_id);
    const riderName = assignedRider ? assignedRider.name : "another rider";
    throw new Error(`Already assigned to ${riderName}`);
  }

  req.status = 'Assigned';
  req.assigned_rider_id = Number(riderId);
  req.updated_at = new Date().toISOString();

  const newEvent = {
    id: sandboxDb.status_events.length > 0 ? Math.max(...sandboxDb.status_events.map(e => e.id)) + 1 : 1,
    delivery_request_id: req.id,
    status: "Assigned",
    changed_by: Number(dispatcherUserId),
    changed_at: new Date().toISOString()
  };
  sandboxDb.status_events.push(newEvent);

  saveSandboxToStorage();
  return req;
}

// 6. POST /requests/{id}/status (Transitions status: Picked Up, Delivered)
async function apiUpdateStatus(id, newStatus, userId, confirmationCode = null) {
  const online = await checkBackendOnline();
  updateStatusIndicator();

  if (online) {
    try {
      const payload = { status: newStatus, changed_by: Number(userId) };
      if (confirmationCode) payload.confirmation_code = confirmationCode;

      const res = await fetch(`${API_BASE_URL}/requests/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) return await res.json();
      
      const err = await res.json();
      throw new Error(err.detail || "Unable to update status.");
    } catch (e) {
      if (e.message !== "Unable to update status." && !isUsingSandbox) {
        throw e;
      }
      console.warn("Endpoint POST /requests/{id}/status failed, using Sandbox fallback.");
    }
  }

  // Sandbox fallback
  const reqIndex = sandboxDb.delivery_requests.findIndex(r => r.id == id);
  if (reqIndex === -1) {
    throw new Error("Request not found.");
  }
  
  const req = sandboxDb.delivery_requests[reqIndex];

  // State transition safety validation
  if (newStatus === "Picked Up") {
    if (req.status !== "Assigned") {
      throw new Error(`Cannot transition from ${req.status} to Picked Up. Current status must be Assigned.`);
    }
    // Generate confirmation code
    const generatedCode = "RX-" + Math.floor(100000 + Math.random() * 900000);
    req.status = "Picked Up";
    req.confirmation_code = generatedCode;
    req.updated_at = new Date().toISOString();

    const newEvent = {
      id: sandboxDb.status_events.length > 0 ? Math.max(...sandboxDb.status_events.map(e => e.id)) + 1 : 1,
      delivery_request_id: req.id,
      status: "Picked Up",
      changed_by: Number(userId),
      changed_at: new Date().toISOString()
    };
    sandboxDb.status_events.push(newEvent);
    saveSandboxToStorage();
    return req;
  }

  if (newStatus === "Delivered") {
    if (req.status !== "Picked Up") {
      throw new Error(`Cannot transition from ${req.status} to Delivered. Current status must be Picked Up.`);
    }
    if (!confirmationCode || req.confirmation_code !== confirmationCode.trim()) {
      throw new Error("Invalid confirmation code.");
    }

    req.status = "Delivered";
    req.updated_at = new Date().toISOString();

    const newEvent = {
      id: sandboxDb.status_events.length > 0 ? Math.max(...sandboxDb.status_events.map(e => e.id)) + 1 : 1,
      delivery_request_id: req.id,
      status: "Delivered",
      changed_by: Number(userId),
      changed_at: new Date().toISOString()
    };
    sandboxDb.status_events.push(newEvent);
    saveSandboxToStorage();
    return req;
  }

  throw new Error("Unsupported state transition.");
}

// 7. GET /requests/{id}
async function apiFetchRequestDetails(id) {
  const online = await checkBackendOnline();
  updateStatusIndicator();

  if (online) {
    try {
      const res = await fetch(`${API_BASE_URL}/requests/${id}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Endpoint GET /requests/{id} failed, using Sandbox fallback.");
    }
  }

  // Sandbox fallback
  const req = sandboxDb.delivery_requests.find(r => r.id == id);
  if (!req) throw new Error("Request not found.");
  return req;
}

// 8. GET /requests/{id}/history
async function apiFetchRequestHistory(id) {
  const online = await checkBackendOnline();
  updateStatusIndicator();

  if (online) {
    try {
      const res = await fetch(`${API_BASE_URL}/requests/${id}/history`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Endpoint GET /requests/{id}/history failed, using Sandbox fallback.");
    }
  }

  // Sandbox fallback (joins status_events with users table to supply user name in logs)
  const events = sandboxDb.status_events.filter(e => e.delivery_request_id == id);
  return events.map(e => {
    const user = sandboxDb.users.find(u => u.id == e.changed_by);
    return {
      id: e.id,
      delivery_request_id: e.delivery_request_id,
      status: e.status,
      changed_by: e.changed_by,
      changed_by_name: user ? user.name : `User ${e.changed_by}`,
      changed_by_role: user ? user.role : 'unknown',
      changed_at: e.changed_at
    };
  });
}
