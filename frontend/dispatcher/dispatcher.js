// Dispatcher Portal Controller
let activeUser = null;
let pollIntervalId = null;
let riders = []; // List of riders for this retailer
let ridersCache = {}; // Map rider user ID -> rider object
let requestsCache = []; // Store current requests list

document.addEventListener('DOMContentLoaded', async () => {
  // Validate session
  const storedUser = sessionStorage.getItem('reflex_user');
  if (!storedUser) {
    window.location.href = '../index.html';
    return;
  }

  activeUser = JSON.parse(storedUser);
  if (activeUser.role !== 'dispatcher') {
    window.location.href = '../index.html';
    return;
  }

  // Set up header info
  document.getElementById('active-user-display').innerHTML = `
    <span class="user-role-label">Dispatcher:</span> ${activeUser.name}
  `;

  // Set up connection indicator
  updateStatusIndicator();

  // Load riders and requests initially
  await loadRiders();
  await refreshData();

  // Polling setup (every 8 seconds)
  pollIntervalId = setInterval(async () => {
    await refreshData();
  }, 8000);
});

window.addEventListener('beforeunload', () => {
  if (pollIntervalId) clearInterval(pollIntervalId);
});

// Show success/error feedback alerts
function showFeedback(message, type = 'success') {
  const alertEl = document.getElementById('feedback-alert');
  alertEl.className = `alert alert-${type}`;
  alertEl.textContent = message;
  alertEl.style.display = 'block';

  // Auto-scroll to feedback
  alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Hide after 5 seconds
  setTimeout(() => {
    alertEl.style.display = 'none';
  }, 5000);
}

// Fetch Riders belonging to this Retailer
async function loadRiders() {
  try {
    riders = await apiFetchUsers('rider', activeUser.retailer_id);
    
    // Update cache map and rider selector dropdown
    ridersCache = {};
    const select = document.getElementById('rider-select');
    select.innerHTML = '<option value="">-- Select Rider --</option>';

    riders.forEach(r => {
      ridersCache[r.id] = r;
      const option = document.createElement('option');
      option.value = r.id;
      option.textContent = `${r.name} (${r.phone})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load riders list:", err);
  }
}

// Refresh Open and Tracked Requests
async function refreshData() {
  try {
    const [openRequests, requests] = await Promise.all([
      apiFetchRequests({ retailer_id: activeUser.retailer_id, status: 'Requested' }),
      apiFetchRequests({ retailer_id: activeUser.retailer_id })
    ]);
    requestsCache = requests;

    renderOpenRequests(openRequests);
    renderAllRequests(requests);
  } catch (err) {
    console.error("Failed to refresh dispatcher lists:", err);
  }
}

// Render Unassigned Requests waiting for a rider
function renderOpenRequests(requests) {
  const tbody = document.getElementById('open-requests-body');
  
  if (requests.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-light); padding: 2.5rem;">
          No pending delivery requests. All caught up!
        </td>
      </tr>
    `;
    return;
  }

  // Sort by oldest first so dispatchers handle them in order (FIFO)
  requests.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  tbody.innerHTML = '';
  requests.forEach(req => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${req.id}</strong></td>
      <td>${escapeHtml(req.item_description)}</td>
      <td>
        <div style="font-weight: 500;">${escapeHtml(req.customer_name)}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(req.customer_phone)}</div>
      </td>
      <td>${escapeHtml(req.address)}</td>
      <td>${formatDate(req.created_at)}</td>
      <td>
        <button class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; width: auto;" onclick="openAssignModal(${req.id})">
          Assign Rider
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render All Requests for tracking status
function renderAllRequests(requests) {
  const tbody = document.getElementById('all-requests-body');

  if (requests.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-light); padding: 2rem;">
          No requests created yet.
        </td>
      </tr>
    `;
    return;
  }

  // Sort by newest updated first
  requests.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  tbody.innerHTML = '';
  requests.forEach(req => {
    const tr = document.createElement('tr');
    
    // Resolve Rider Name
    let riderDisplay = '<span style="color: var(--text-light)">Unassigned</span>';
    if (req.assigned_rider_id) {
      const cachedRider = ridersCache[req.assigned_rider_id];
      riderDisplay = cachedRider ? cachedRider.name : `Rider #${req.assigned_rider_id}`;
    }

    // Format Status Badge
    let badgeClass = 'badge-requested';
    if (req.status === 'Assigned') badgeClass = 'badge-assigned';
    if (req.status === 'Picked Up') badgeClass = 'badge-picked-up';
    if (req.status === 'Delivered') badgeClass = 'badge-delivered';

    tr.innerHTML = `
      <td><strong>#${req.id}</strong></td>
      <td>${escapeHtml(req.item_description)}</td>
      <td>
        <div style="font-weight: 500;">${escapeHtml(req.customer_name)}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(req.customer_phone)}</div>
      </td>
      <td><span class="badge ${badgeClass}">${req.status}</span></td>
      <td>${riderDisplay}</td>
      <td>${formatDate(req.updated_at)}</td>
      <td>
        <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.85rem; width: auto;" onclick="showHistory(${req.id})">
          History
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Assignment Modal Controls
function openAssignModal(id) {
  const req = requestsCache.find(r => r.id == id);
  if (!req) return;

  document.getElementById('assign-request-id').value = req.id;
  document.getElementById('assign-req-details').innerHTML = `
    <strong>Delivery Job #${req.id}</strong><br>
    <strong>Item:</strong> ${escapeHtml(req.item_description)}<br>
    <strong>Address:</strong> ${escapeHtml(req.address)}<br>
    <strong>Customer:</strong> ${escapeHtml(req.customer_name)} (${escapeHtml(req.customer_phone)})
  `;

  // Reset dropdown select
  document.getElementById('rider-select').value = "";
  
  // Show Modal
  document.getElementById('assign-modal').style.display = 'flex';
}

function closeAssignModal() {
  document.getElementById('assign-modal').style.display = 'none';
}

// Execute Rider Assignment Action
async function handleAssignRider(event) {
  event.preventDefault();

  const id = document.getElementById('assign-request-id').value;
  const riderId = document.getElementById('rider-select').value;
  const confirmBtn = document.getElementById('confirm-assign-btn');

  if (!id || !riderId) return;

  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Assigning...';

  try {
    const updatedRequest = await apiAssignRider(id, riderId, activeUser.id);
    
    // Close Modal and notify
    closeAssignModal();
    const rider = ridersCache[riderId];
    showFeedback(`Delivery #${id} successfully assigned to ${rider ? rider.name : 'Rider'}.`, 'success');
    
    // Refresh
    await refreshData();
  } catch (err) {
    console.error("Assignment conflict or error:", err);
    closeAssignModal();
    
    // Professional and clear concurrency failure message
    if (err.message.includes("Already assigned")) {
      showFeedback(`Unable to assign. This delivery has already been assigned.`, "error");
    } else {
      showFeedback(err.message || "Failed to assign rider. Please try again.", "error");
    }
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirm Assignment';
  }
}

// Show Timeline History Modal (Identical to Retailer logic)
async function showHistory(id) {
  const modal = document.getElementById('history-modal');
  const detailsEl = document.getElementById('history-request-details');
  const timelineEl = document.getElementById('history-timeline');

  modal.style.display = 'flex';
  detailsEl.innerHTML = 'Loading request info...';
  timelineEl.innerHTML = '<div style="color: var(--text-light)">Loading logs...</div>';

  try {
    const [req, history] = await Promise.all([
      apiFetchRequestDetails(id),
      apiFetchRequestHistory(id)
    ]);

    // Populate details panel
    detailsEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
        <strong>Delivery Request #${req.id}</strong>
        <span style="font-size: 0.8rem; padding: 0.2rem 0.5rem; border-radius: 99px; background-color: var(--bg-color); border: 1px solid var(--border-color);">
          Created: ${formatDate(req.created_at)}
        </span>
      </div>
      <div><strong>Customer:</strong> ${escapeHtml(req.customer_name)} (${escapeHtml(req.customer_phone)})</div>
      <div><strong>Address:</strong> ${escapeHtml(req.address)}</div>
      <div><strong>Item:</strong> ${escapeHtml(req.item_description)}</div>
    `;

    // Populate timeline
    if (history.length === 0) {
      timelineEl.innerHTML = '<div style="color: var(--text-light); padding: 1rem 0;">No status events recorded yet.</div>';
      return;
    }

    history.sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));

    timelineEl.innerHTML = '';
    history.forEach((event, idx) => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      
      const isActive = idx === history.length - 1;
      
      item.innerHTML = `
        <div class="timeline-marker ${isActive ? 'active' : ''}"></div>
        <div class="timeline-content">
          <div class="timeline-status">${event.status}</div>
          <div class="timeline-meta">
            By ${escapeHtml(event.changed_by_name)} (${event.changed_by_role}) 
            at ${formatTime(event.changed_at)}
          </div>
        </div>
      `;
      timelineEl.appendChild(item);
    });
  } catch (err) {
    console.error("Failed to load history:", err);
    detailsEl.innerHTML = '<span style="color: var(--error-text);">Failed to load details.</span>';
    timelineEl.innerHTML = '<div style="color: var(--error-text);">Failed to load history audit log.</div>';
  }
}

function closeHistoryModal() {
  document.getElementById('history-modal').style.display = 'none';
}

// Helpers
function logout() {
  sessionStorage.removeItem('reflex_user');
  window.location.href = '../index.html';
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
