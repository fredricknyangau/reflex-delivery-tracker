// Reflex Landing & Session Controller
let selectedRole = null;
let roleUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Clear any existing session for clean start
  sessionStorage.removeItem('reflex_user');
  
  // Triggers checking connection state and updating UI
  await checkBackendOnline();
  updateStatusIndicator();
});

function selectRole(role) {
  selectedRole = role;
  
  // Highlight UI Option
  document.querySelectorAll('.role-option').forEach(el => el.classList.remove('selected'));
  
  if (role === 'retailer_staff') {
    document.getElementById('role-retailer').classList.add('selected');
  } else if (role === 'dispatcher') {
    document.getElementById('role-dispatcher').classList.add('selected');
  } else if (role === 'rider') {
    document.getElementById('role-rider').classList.add('selected');
  }

  // Fetch users matching selected role
  loadUsersForRole(role);
}

async function loadUsersForRole(role) {
  const userSelect = document.getElementById('user-select');
  const selectionGroup = document.getElementById('user-selection-group');
  const proceedBtn = document.getElementById('proceed-btn');
  const detailsTip = document.getElementById('user-details-tip');

  proceedBtn.disabled = true;
  detailsTip.textContent = '';
  userSelect.innerHTML = '<option value="">-- Loading Users... --</option>';
  selectionGroup.style.display = 'block';

  try {
    roleUsers = await apiFetchUsers(role);
    
    userSelect.innerHTML = '<option value="">-- Choose User --</option>';
    if (roleUsers.length === 0) {
      userSelect.innerHTML = '<option value="">No users found for this role</option>';
      return;
    }

    roleUsers.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.name;
      userSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load users for role:", err);
    userSelect.innerHTML = '<option value="">Error loading profiles</option>';
  }
}

function onUserChanged() {
  const userSelect = document.getElementById('user-select');
  const proceedBtn = document.getElementById('proceed-btn');
  const detailsTip = document.getElementById('user-details-tip');
  const userId = userSelect.value;

  if (!userId) {
    proceedBtn.disabled = true;
    detailsTip.textContent = '';
    return;
  }

  const user = roleUsers.find(u => u.id == userId);
  if (user) {
    proceedBtn.disabled = false;
    
    if (user.retailer_id) {
      // Find retailer name if available
      apiFetchRetailers().then(retailers => {
        const ret = retailers.find(r => r.id == user.retailer_id);
        const retName = ret ? ret.business_name : `Retailer #${user.retailer_id}`;
        detailsTip.textContent = `Acting on behalf of: ${retName}`;
      });
    } else {
      detailsTip.textContent = `Independent user profile`;
    }
  }
}

function proceedToUI() {
  const userSelect = document.getElementById('user-select');
  const userId = userSelect.value;
  if (!userId) return;

  const user = roleUsers.find(u => u.id == userId);
  if (!user) return;

  // Save session details
  sessionStorage.setItem('reflex_user', JSON.stringify(user));

  // Route to the appropriate subfolder
  if (user.role === 'retailer_staff') {
    window.location.href = 'retailer/index.html';
  } else if (user.role === 'dispatcher') {
    window.location.href = 'dispatcher/index.html';
  } else if (user.role === 'rider') {
    window.location.href = 'rider/index.html';
  }
}
