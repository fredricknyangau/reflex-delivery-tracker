// Retailer Portal Controller
let activeUser = null;
let pollIntervalId = null;
let ridersCache = {}; // Map rider user ID -> rider object

document.addEventListener('DOMContentLoaded', async () => {
  // Validate active session
  const storedUser = sessionStorage.getItem('reflex_user');
  if (!storedUser) {
    window.location.href = '../index.html';
    return;
  }

  activeUser = JSON.parse(storedUser);
  if (activeUser.role !== 'retailer_staff') {
    window.location.href = '../index.html';
    return;
  }

  // Set up header info
  document.getElementById('active-user-display').innerHTML = `
    <span class="user-role-label">Retailer Staff:</span> ${activeUser.name}
  `;

  // Pre-load riders list to resolve rider names on the client
  try {
    const riders = await apiFetchUsers('rider', activeUser.retailer_id);
    riders.forEach(r => {
      ridersCache[r.id] = r;
    });
  } catch (err) {
    console.error("Failed to pre-cache riders list:", err);
  }

  // Initial load
  await refreshRequestList();

  // Set up status indicator
  updateStatusIndicator();

  // Polling setup (every 8 seconds)
  pollIntervalId = setInterval(async () => {
    await refreshRequestList();
  }, 8000);
});

// Clean up polling interval when page changes
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

// Create Delivery Request Handler
async function handleCreateRequest(event) {
  event.preventDefault();
  
  const customerName = document.getElementById('customer_name').value.trim();
  const customerPhone = document.getElementById('customer_phone').value.trim();
  const address = document.getElementById('address').value.trim();
  const itemDescription = document.getElementById('item_description').value.trim();
  
  const submitBtn = document.getElementById('submit-request-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const requestData = {
      retailer_id: activeUser.retailer_id,
      created_by: activeUser.id,
      customer_name: customerName,
      customer_phone: customerPhone,
      address: address,
      item_description: itemDescription
    };

    const newRequest = await apiCreateDeliveryRequest(requestData);
    
    showFeedback(`Delivery request created successfully. ID: ${newRequest.id}`, 'success');
    
    // Reset Form
    document.getElementById('create-request-form').reset();
    
    // Refresh list to display new row
    await refreshRequestList();
  } catch (err) {
    console.error("Error creating delivery request:", err);
    showFeedback(err.message || "Unable to create delivery request. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Request';
  }
}

// Refresh Delivery Requests List
async function refreshRequestList() {
  try {
    const requests = await apiFetchRequests({ retailer_id: activeUser.retailer_id });
    const tbody = document.getElementById('requests-list-body');
    
    if (requests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-light); padding: 2rem;">
            No delivery requests found.
          </td>
        </tr>
      `;
      return;
    }

    // Sort requests by newest first
    requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    tbody.innerHTML = '';
    requests.forEach(req => {
      const tr = document.createElement('tr');
      
      // Determine rider display name
      let riderDisplay = '<span style="color: var(--text-light)">Unassigned</span>';
      if (req.assigned_rider_id) {
        const cachedRider = ridersCache[req.assigned_rider_id];
        riderDisplay = cachedRider ? cachedRider.name : `Rider #${req.assigned_rider_id}`;
      }

      // Format status badge
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
        <td>
          <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.85rem; width: auto;" onclick="showHistory(${req.id})">
            History
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to refresh requests list:", err);
  }
}

// Show Timeline History Modal
async function showHistory(id) {
  const modal = document.getElementById('history-modal');
  const detailsEl = document.getElementById('history-request-details');
  const timelineEl = document.getElementById('history-timeline');

  // Open modal first with loading state
  modal.style.display = 'flex';
  detailsEl.innerHTML = 'Loading request info...';
  timelineEl.innerHTML = '<div style="color: var(--text-light)">Loading logs...</div>';

  try {
    // Fetch request details and history in parallel
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

    // Sort status events by oldest first for correct chronological timeline flow
    history.sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));

    timelineEl.innerHTML = '';
    history.forEach((event, idx) => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      
      const isActive = idx === history.length - 1; // Highlight the latest transition
      
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
