// Rider Portal Controller
let activeUser = null;
let pollIntervalId = null;
let retailersCache = {}; // Map retailer ID -> retailer object
let deliveriesCache = []; // Store current deliveries list

document.addEventListener('DOMContentLoaded', async () => {
  // Validate session
  const storedUser = sessionStorage.getItem('reflex_user');
  if (!storedUser) {
    window.location.href = '../index.html';
    return;
  }

  activeUser = JSON.parse(storedUser);
  if (activeUser.role !== 'rider') {
    window.location.href = '../index.html';
    return;
  }

  // Set up header info
  document.getElementById('active-user-display').innerHTML = `
    <span class="user-role-label">Rider:</span> ${activeUser.name}
  `;

  // Set up connection indicator
  updateStatusIndicator();

  // Load retailers to cache business locations
  try {
    const retailers = await apiFetchRetailers();
    retailers.forEach(r => {
      retailersCache[r.id] = r;
    });
  } catch (err) {
    console.error("Failed to cache retailers list:", err);
  }

  // Initial load
  await refreshDeliveries();

  // Polling setup (every 8 seconds)
  pollIntervalId = setInterval(async () => {
    await refreshDeliveries();
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

// Refresh Deliveries List
async function refreshDeliveries() {
  try {
    const requests = await apiFetchRequests({ assigned_to: activeUser.id });
    deliveriesCache = requests;
    renderDeliveries(requests);
  } catch (err) {
    console.error("Failed to refresh rider deliveries:", err);
  }
}

// Render Deliveries Cards
function renderDeliveries(requests) {
  const listEl = document.getElementById('rider-deliveries-list');
  
  if (requests.length === 0) {
    listEl.innerHTML = `
      <div class="card" style="text-align: center; color: var(--text-light); padding: 3rem; grid-column: 1 / -1;">
        No active delivery jobs assigned to you yet.
      </div>
    `;
    return;
  }

  // Sort by newest updated first
  requests.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  listEl.innerHTML = '';
  requests.forEach(req => {
    const card = document.createElement('div');
    card.className = 'card';
    
    // Resolve Retailer Location Details
    const retailer = retailersCache[req.retailer_id];
    const retailerName = retailer ? retailer.business_name : `Retailer #${req.retailer_id}`;
    const retailerAddress = retailer ? retailer.address : 'Unknown Address';
    const retailerPhone = retailer ? retailer.phone : '';

    // Status Badge classes
    let badgeClass = 'badge-assigned';
    if (req.status === 'Picked Up') badgeClass = 'badge-picked-up';
    if (req.status === 'Delivered') badgeClass = 'badge-delivered';

    // Build card content depending on lifecycle status
    let actionHtml = '';
    
    if (req.status === 'Assigned') {
      actionHtml = `
        <div style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <button class="btn btn-primary" onclick="handlePickup(${req.id}, this)">
            Mark Picked Up
          </button>
        </div>
      `;
    } else if (req.status === 'Picked Up') {
      actionHtml = `
        <div style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 1rem; background-color: var(--bg-color); padding: 1rem; border-radius: 6px; border: 1px dashed var(--border-color);">
          <div style="margin-bottom: 0.75rem;">
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">CONFIRMATION CODE (Give to customer):</span>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary-color); letter-spacing: 1px; margin-top: 0.25rem;">
              ${req.confirmation_code || 'CODE ERROR'}
            </div>
          </div>
          
          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label for="code-input-${req.id}" style="font-size: 0.8rem; font-weight: 600;">Verify Customer Code at Site:</label>
            <input type="text" id="code-input-${req.id}" class="form-control" placeholder="e.g. RX-123456" style="text-transform: uppercase;">
          </div>
          
          <button class="btn btn-primary" onclick="handleDelivery(${req.id}, this)">
            Confirm Delivery
          </button>
        </div>
      `;
    } else if (req.status === 'Delivered') {
      actionHtml = `
        <div style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 1rem; color: var(--success-text); font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; gap: 0.35rem;">
          ✓ Delivery completed successfully.
        </div>
      `;
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <span style="font-weight: 600; color: var(--text-muted);">JOB #${req.id}</span>
        <span class="badge ${badgeClass}">${req.status}</span>
      </div>
      
      <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-main);">
        ${escapeHtml(req.item_description)}
      </div>

      <div style="font-size: 0.9rem; margin-bottom: 0.75rem;">
        <div style="color: var(--text-muted); font-weight: 500; font-size: 0.8rem; margin-bottom: 0.15rem;">PICKUP FROM (RETAILER):</div>
        <strong>${escapeHtml(retailerName)}</strong><br>
        <span style="color: var(--text-muted);">${escapeHtml(retailerAddress)}</span> 
        ${retailerPhone ? `<br><span style="color: var(--primary-color);">${escapeHtml(retailerPhone)}</span>` : ''}
      </div>

      <div style="font-size: 0.9rem; margin-bottom: 1rem;">
        <div style="color: var(--text-muted); font-weight: 500; font-size: 0.8rem; margin-bottom: 0.15rem;">DELIVER TO (CUSTOMER):</div>
        <strong>${escapeHtml(req.customer_name)}</strong> (${escapeHtml(req.customer_phone)})<br>
        <span style="color: var(--text-muted);">${escapeHtml(req.address)}</span>
      </div>

      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; width: auto;" onclick="showHistory(${req.id})">
          View History
        </button>
      </div>

      ${actionHtml}
    `;

    listEl.appendChild(card);
  });
}

// Mark Picked Up Action
async function handlePickup(id, buttonEl) {
  buttonEl.disabled = true;
  buttonEl.textContent = 'Updating...';

  try {
    const updated = await apiUpdateStatus(id, 'Picked Up', activeUser.id);
    showFeedback(`Order #${id} marked as Picked Up. Confirmation code generated.`, 'success');
    await refreshDeliveries();
  } catch (err) {
    console.error("Failed to mark picked up:", err);
    showFeedback(err.message || "Failed to update status. Please try again.", "error");
    buttonEl.disabled = false;
    buttonEl.textContent = 'Mark Picked Up';
  }
}

// Complete Delivery Action (Validates confirmation code)
async function handleDelivery(id, buttonEl) {
  const inputEl = document.getElementById(`code-input-${id}`);
  const code = inputEl.value.trim().toUpperCase();

  if (!code) {
    showFeedback("Please enter the confirmation code before submitting.", "error");
    inputEl.focus();
    return;
  }

  buttonEl.disabled = true;
  buttonEl.textContent = 'Verifying...';

  try {
    const updated = await apiUpdateStatus(id, 'Delivered', activeUser.id, code);
    showFeedback(`Delivery #${id} confirmed and marked as Delivered successfully!`, 'success');
    await refreshDeliveries();
  } catch (err) {
    console.error("Failed to confirm delivery:", err);
    
    // Clearer user-facing error message for incorrect confirmation codes
    if (err.message.includes("code")) {
      showFeedback("Invalid confirmation code. Please check and try again.", "error");
    } else {
      showFeedback(err.message || "Failed to confirm delivery.", "error");
    }
    
    buttonEl.disabled = false;
    buttonEl.textContent = 'Confirm Delivery';
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
