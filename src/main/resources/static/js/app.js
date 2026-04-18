const API_URL = "/api";

// Global variable for chart instance
let myChart = null;

// Utility to handle form submissions
document.addEventListener("DOMContentLoaded", () => {
  // Login Logic
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const errorDiv = document.getElementById("loginError");

      try {
        const response = await fetch(`${API_URL}/auth/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data));
          window.location.href = "dashboard.html";
        } else {
          errorDiv.textContent = data.message || "Login failed";
          errorDiv.classList.remove("d-none");
        }
      } catch (error) {
        errorDiv.textContent = "An error occurred. Please try again.";
        errorDiv.classList.remove("d-none");
      }
    });
  }

  // Register Logic
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const age = document.getElementById("age").value;
      const gender = document.getElementById("gender").value;
      const city = document.getElementById("city").value;
      const errorDiv = document.getElementById("registerError");

      try {
        const response = await fetch(`${API_URL}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, age, gender, city }),
        });

        const data = await response.json();

        if (response.ok) {
          alert("Registration successful! Please login.");
          window.location.href = "login.html";
        } else {
          errorDiv.textContent = data.message || "Registration failed";
          errorDiv.classList.remove("d-none");
        }
      } catch (error) {
        errorDiv.textContent = "An error occurred. Please try again.";
        errorDiv.classList.remove("d-none");
      }
    });
  }

  // Preferences Form Logic
  const preferencesForm = document.getElementById("preferencesForm");
  if (preferencesForm) {
    preferencesForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(preferencesForm);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await authFetch(`${API_URL}/preferences`, {
          method: "POST",
          body: JSON.stringify(data),
        });

        if (response.ok) {
          alert("Preferences saved successfully!");
          window.location.href = "dashboard.html";
        } else {
          alert("Failed to save preferences.");
        }
      } catch (error) {
        console.error(error);
        alert("Error saving preferences.");
      }
    });
  }

  // Post Room Logic
  const postRoomForm = document.getElementById("postRoomForm");
  if (postRoomForm) {
    postRoomForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append("location", document.getElementById("roomLocation").value);
      formData.append("rent", document.getElementById("roomRent").value);
      formData.append("roomType", document.getElementById("roomType").value);
      formData.append("amenities", document.getElementById("roomAmenities").value);
      formData.append("description", document.getElementById("roomDesc").value);
      
      const photosInput = document.getElementById("roomPhotos");
      if (photosInput && photosInput.files.length > 0) {
        for (let i = 0; i < photosInput.files.length; i++) {
            formData.append("photos", photosInput.files[i]);
        }
      }

      const videoInput = document.getElementById("roomVideo");
      if (videoInput && videoInput.files.length > 0) {
        formData.append("video", videoInput.files[0]);
      }

      try {
        const response = await authFetch(`${API_URL}/rooms`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          alert("Room posted successfully!");
          location.reload();
        } else {
          alert("Failed to post room.");
        }
      } catch (error) {
        console.error(error);
        alert("Error posting room.");
      }
    });
  }

  // Auth Check for Protected Pages
  const token = localStorage.getItem("token");
  const protectedPages = [
    "dashboard.html",
    "preferences.html",
    "rooms.html",
    "profile.html",
    "chat.html",
    "requests.html",
  ];
  const pathName = window.location.pathname.split("/").pop();

  if (protectedPages.includes(pathName) && !token) {
    window.location.href = "login.html";
  }

  // Profile Form Logic
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(profileForm);

      try {
        const response = await authFetch(`${API_URL}/user/profile`, {
          method: "PUT",
          body: formData,
        });

        if (response.ok) {
          const updatedUser = await response.json();
          const sessionUser = JSON.parse(localStorage.getItem("user"));
          const newSession = { ...sessionUser, ...updatedUser };
          localStorage.setItem("user", JSON.stringify(newSession));

          alert("Profile updated successfully!");

          // Redirect to preferences if not set (we'll rely on checkMandatorySetup for this flow usually,
          // but explicit redirect is good for UX after save)
          window.location.href = "preferences.html";
        } else {
          const err = await response.text();
          alert("Failed to update profile: " + err);
        }
      } catch (error) {
        console.error(error);
        alert("Error updating profile.");
      }
    });
  }
  // Initial Unread Count Load
  updateUnreadCount();
  updateRequestUnreadCount();
  // Poll every 10 seconds
  setInterval(() => {
    updateUnreadCount();
    updateRequestUnreadCount();
  }, 10000);
});

// Helper for authorized fetch
async function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("authFetch: No token found in localStorage");
    // Return a dummy response with ok: false to prevent crashes in callers
    return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
  }

  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  // Only set JSON content type if body is NOT FormData (browser sets multipart for FormData)
  if (!(options.body instanceof FormData)) {
    options.headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, options);

    if (response.status === 401) {
      console.error(
        "authFetch: 401 Unauthorized received. Token likely invalid/expired. Logging out.",
      );
      logout(); // Auto-logout to prevent infinite error loops
      return response;
    }

    return response;
  } catch (error) {
    console.error("authFetch: Network error", error);
    throw error;
  }
}

// Logout function
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// ---- Dashboard Functions ----

async function loadDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    // displayed name is user.name (from backend) or user.username (email) or "User"
    document.getElementById("userName").textContent =
      user.name || (user.username ? user.username.split(" ")[0] : "User");
  }

  try {
    const response = await authFetch(`${API_URL}/matches`);
    if (!response.ok) throw new Error("Failed to fetch matches");

    const matches = await response.json();
    const container = document.getElementById("matchesContainer");
    container.innerHTML = "";

    if (matches.length === 0) {
      container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="glass-card p-5 d-inline-block">
                        <i class="fas fa-search fa-3x mb-3 text-white-50"></i>
                        <h3>No matches found yet</h3>
                        <p class="mb-4">Please complete your preferences to get matched!</p>
                        <a href="preferences.html" class="btn btn-primary-custom">Update Preferences</a>
                    </div>
                </div>
            `;
      return;
    }

    matches.forEach((match) => {
      const mUser = match.user;
      const score = match.score;
      // match.details is used in the modal

      const col = document.createElement("div");
      col.className = "col-lg-4 col-md-6 animate-fade-in";
      // Encode match object for onclick
      const matchJson = JSON.stringify(match).replace(/"/g, "&quot;");

      col.innerHTML = `
                <div class="glass-card p-4 h-100 position-relative hover-lift">
                    <div class="position-absolute top-0 end-0 m-3">
                        <span class="badge bg-success rounded-pill px-3 py-2 fs-6">${score}% Match</span>
                    </div>
                    <div class="text-center mt-3">
                        <div class="ratio ratio-1x1 mx-auto mb-3" style="width: 100px;">
                            <img src="${mUser.profileImage || `https://ui-avatars.com/api/?name=${mUser.name}&background=random`}" 
                                 class="rounded-circle object-fit-cover border border-2 border-white">
                        </div>
                        <h4 class="fw-bold">${mUser.name}</h4>
                        <p class="text-white-50 mb-1"><i class="fas fa-map-marker-alt me-2"></i>${mUser.city || "Unknown City"}</p>
                        <p class="small text-white-50">${mUser.gender}, ${mUser.age} years old</p>
                        
                        <div class="d-flex justify-content-center gap-2 mt-4">
                            <button class="btn btn-primary-custom btn-sm flex-grow-1" 
                                onclick="showMatchDetails(${matchJson})">
                                View Details
                            </button>
                             <button class="btn btn-secondary-custom btn-sm" onclick="startChat(${mUser.id})">
                                <i class="fas fa-comment"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
      container.appendChild(col);
    });
  } catch (error) {
    console.error(error);
    const container = document.getElementById("matchesContainer");
    if (container)
      container.innerHTML =
        '<p class="text-center text-danger">Error loading matches. Please try again later.</p>';
  }
}

// Function to show modal with chart
window.showMatchDetails = function (matchData) {
  const user = matchData.user;
  const details = matchData.details;

  document.getElementById("modalUserName").textContent = user.name;
  document.getElementById("modalUserBio").textContent =
    user.bio || "No bio available.";

  // Store ID for reporting
  let hiddenId = document.getElementById("modalUserId");
  if (!hiddenId) {
    hiddenId = document.createElement("input");
    hiddenId.type = "hidden";
    hiddenId.id = "modalUserId";
    document.getElementById("matchModal").appendChild(hiddenId);
  }
  hiddenId.value = user.id;

  // Set Image
  const imgUrl =
    user.profileImage ||
    `https://ui-avatars.com/api/?name=${user.name}&background=random`;
  document.getElementById("modalUserImage").src = imgUrl;

  // Chart Logic
  const ctx = document.getElementById("compatibilityChart").getContext("2d");

  if (myChart) {
    myChart.destroy();
  }

  const labels = Object.keys(details);
  const data = Object.values(details);

  myChart = new Chart(ctx, {
    type: "bar", // Requested Bar Chart
    data: {
      labels: labels,
      datasets: [
        {
          label: "Compatibility Score",
          data: data,
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          borderColor: "rgba(255, 255, 255, 1)",
          borderWidth: 1,
          borderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 15, // max weight approx
          grid: { color: "rgba(255,255,255,0.1)" },
          ticks: { color: "white" },
        },
        x: {
          grid: { display: false },
          ticks: { color: "white" },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });

  const modal = new bootstrap.Modal(document.getElementById("matchModal"));
  modal.show();
};

// ---- Preferences Functions ----

async function loadPreferences() {
  try {
    const response = await authFetch(`${API_URL}/preferences`);
    if (response.ok) {
      const prefs = await response.json();
      if (prefs) {
        // Populate form
        const form = document.getElementById("preferencesForm");
        if (form) {
          Object.keys(prefs).forEach((key) => {
            if (form.elements[key]) {
              form.elements[key].value = prefs[key];
            }
          });
        }
      }
    }
  } catch (error) {
    console.error("Error loading preferences", error);
  }
}

// ---- Rooms Functions ----

async function loadRooms(filters = {}) {
  try {
    // Construct query params
    const params = new URLSearchParams();
    for (const key in filters) {
      if (filters[key]) params.append(key, filters[key]);
    }

    const response = await authFetch(`${API_URL}/rooms?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch rooms");

    const rooms = await response.json();
    const container = document.getElementById("roomsContainer");
    container.innerHTML = "";

    if (rooms.length === 0) {
      container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="text-white-50">No rooms available at the moment. Be the first to post!</p>
                </div>
            `;
      return;
    }

    rooms.forEach((room) => {
      let mediaHtml = '';
      if (room.photoUrls && room.photoUrls.length > 0) {
          if (room.photoUrls.length === 1 && !room.videoUrl) {
              mediaHtml = `<img src="${room.photoUrls[0]}" class="object-fit-cover w-100 h-100">`;
          } else {
              let indicators = '';
              let items = '';
              
              room.photoUrls.forEach((url, i) => {
                  indicators += `<button type="button" data-bs-target="#carousel-${room.id}" data-bs-slide-to="${i}" class="${i === 0 ? 'active' : ''}"></button>`;
                  items += `<div class="carousel-item ${i === 0 ? 'active' : ''} h-100">
                                <img src="${url}" class="d-block w-100 h-100 object-fit-cover">
                            </div>`;
              });

              if (room.videoUrl) {
                  let vIndex = room.photoUrls.length;
                  indicators += `<button type="button" data-bs-target="#carousel-${room.id}" data-bs-slide-to="${vIndex}" class="${vIndex === 0 && room.photoUrls.length === 0 ? 'active' : ''}"></button>`;
                  items += `<div class="carousel-item ${vIndex === 0 && room.photoUrls.length === 0 ? 'active' : ''} h-100 bg-dark text-center">
                                <video src="${room.videoUrl}" controls class="h-100 w-100 object-fit-contain"></video>
                            </div>`;
              }
              
              mediaHtml = `
              <div id="carousel-${room.id}" class="carousel slide h-100" data-bs-ride="carousel">
                  <div class="carousel-indicators">${indicators}</div>
                  <div class="carousel-inner h-100">${items}</div>
                  <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${room.id}" data-bs-slide="prev">
                      <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                      <span class="visually-hidden">Previous</span>
                  </button>
                  <button class="carousel-control-next" type="button" data-bs-target="#carousel-${room.id}" data-bs-slide="next">
                      <span class="carousel-control-next-icon" aria-hidden="true"></span>
                      <span class="visually-hidden">Next</span>
                  </button>
              </div>`;
          }
      } else if (room.videoUrl) {
          mediaHtml = `<video src="${room.videoUrl}" controls class="h-100 w-100 object-fit-contain bg-dark"></video>`;
      } else {
          mediaHtml = `<img src="${room.imageUrl || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60"}" class="object-fit-cover w-100 h-100">`;
      }

      const currentUser = JSON.parse(localStorage.getItem("user"));
      const isOwner = currentUser && room.owner && room.owner.id === currentUser.id;

      const col = document.createElement("div");
      col.className = "col-lg-4 col-md-6 animate-fade-in";
      col.innerHTML = `
                <div class="glass-card p-0 h-100 overflow-hidden hover-lift">
                    <div class="ratio ratio-16x9">
                        ${mediaHtml}
                    </div>
                    <div class="p-4">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                             <h4 class="fw-bold mb-0">₹${room.rent}</h4>
                             <span class="badge bg-primary rounded-pill">${room.roomType}</span>
                        </div>
                        <p class="text-white-50 mb-1"><i class="fas fa-map-marker-alt me-2"></i>${room.location}</p>
                        <p class="small text-white-50 mb-3">${room.amenities || "No amenities listed"}</p>
                        <p class="small text-white-50 text-truncate">${room.description || ""}</p>
                        
                        <div class="d-grid mt-3">
                            ${isOwner ? 
                                `<button class="btn btn-outline-secondary btn-sm" disabled>Your Room</button>` :
                                `<button class="btn btn-secondary-custom btn-sm" onclick="requestRoom(${room.id})">Request Room</button>`
                            }
                        </div>
                    </div>
                </div>
            `;
      container.appendChild(col);
    });
  } catch (error) {
    console.error(error);
    const container = document.getElementById("roomsContainer");
    if (container)
      container.innerHTML =
        '<p class="text-center text-danger">Error loading rooms.</p>';
  }
}

async function requestRoom(roomId) {
  if (confirm("Are you sure you want to send a request for this room?")) {
    try {
      const response = await authFetch(`${API_URL}/requests/${roomId}`, {
        method: "POST",
      });
      if (response.ok) {
        alert("Request sent successfully!");
      } else {
        alert("Failed to send request.");
      }
    } catch (error) {
      console.error(error);
      alert("Error sending request.");
    }
  }
}

// Filter Form Logic
const filterForm = document.getElementById("filterForm");
if (filterForm) {
  filterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const filters = {
      location: document.getElementById("filterLocation").value.trim(),
      minRent: document.getElementById("filterMinRent").value,
      maxRent: document.getElementById("filterMaxRent").value,
      roomType: document.getElementById("filterRoomType").value,
    };
    loadRooms(filters);
  });
}

window.resetFilters = function () {
  const form = document.getElementById("filterForm");
  if (form) form.reset();
  loadRooms();
};

// ---- Profile Functions ----

async function loadProfile() {
  try {
    const response = await authFetch(`${API_URL}/user/profile`);
    if (response.ok) {
      const user = await response.json();

      // Populate form fields
      if (document.getElementById("profileName"))
        document.getElementById("profileName").value = user.name || "";
      if (document.getElementById("profileEmail"))
        document.getElementById("profileEmail").value = user.email || "";
      if (document.getElementById("profileAge"))
        document.getElementById("profileAge").value = user.age || "";
      if (document.getElementById("profileGender"))
        document.getElementById("profileGender").value = user.gender || "Male";
      if (document.getElementById("profileCity"))
        document.getElementById("profileCity").value = user.city || "";
      if (document.getElementById("profileBio"))
        document.getElementById("profileBio").value = user.bio || "";
      if (document.getElementById("budgetMin"))
        document.getElementById("budgetMin").value = user.budgetMin || "";
      if (document.getElementById("budgetMax"))
        document.getElementById("budgetMax").value = user.budgetMax || "";

      // Update Image Preview
      const imgPreview = document.getElementById("profileImagePreview");
      if (imgPreview) {
        imgPreview.src =
          user.profileImage ||
          `https://ui-avatars.com/api/?name=${user.name}&background=random`;
      }
    }
  } catch (error) {
    console.error("Error loading profile", error);
  }
}

// Check for mandatory setup: Profile Image -> Preferences -> Dashboard
async function checkMandatorySetup() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const pathName = window.location.pathname.split("/").pop();

  try {
    // 1. Check User Profile
    const userRes = await authFetch(`${API_URL}/user/profile`);
    if (userRes.ok) {
      const user = await userRes.json();

      // If no profile image (and not currently on profile page), force profile
      /* 
      // User requested to make profile photo optional. Commenting out mandatory check.
      if (
        (!user.profileImage || user.profileImage.trim() === "") &&
        pathName !== "profile.html"
      ) {
        console.log("Mandatory Setup: Missing Profile Image");
        alert("Please upload a profile photo to continue.");
        window.location.href = "profile.html";
        return;
      }
      */

      // 2. Check Preferences (only if profile is OK)
      // We can't easily check logic here without a specific endpoint or checking the preferences list
      if (pathName !== "preferences.html" && pathName !== "profile.html") {
        // Try fetching preferences
        // The backend returns a Map<String, String>. If empty, it returns 200 with empty map?
        // Or we can check if the response body is empty JSON.
        const prefRes = await authFetch(`${API_URL}/preferences`);
        if (prefRes.ok) {
          const prefs = await prefRes.json();
          // If prefs is empty object or null
          if (!prefs || Object.keys(prefs).length === 0) {
            console.log("Mandatory Setup: Missing Preferences");
            alert("Please set your room preferences to continue.");
            window.location.href = "preferences.html";
          }
        } else if (prefRes.status === 404 || prefRes.status === 204) {
          alert("Please set your room preferences to continue.");
          window.location.href = "preferences.html";
        }
      }
    }
  } catch (e) {
    console.error("Error checking setup status", e);
  }
}

// Run check on protected pages
if (
  ["dashboard.html", "rooms.html"].includes(
    window.location.pathname.split("/").pop(),
  )
) {
  document.addEventListener("DOMContentLoaded", () => {
    // Warning: This runs in parallel with loadDashboard, might race.
    // But acceptable for now.
    setTimeout(checkMandatorySetup, 500); // Small delay to let initial loads happen
  });
}

// ---- Chat Functions ----

// ---- Chat Functions ----

let activeChatUserId = null;
let chatPollInterval = null;
let lastMessageTimestamp = null;

async function loadConversations() {
  const list = document.getElementById("conversationsList");
  if (!list) return;

  try {
    const response = await authFetch(`${API_URL}/messages/conversations`);
    if (response.ok) {
      const users = await response.json();
      list.innerHTML = "";

      if (users.length === 0) {
        list.innerHTML =
          '<p class="text-white-50 text-center p-3">No conversations yet.</p>';
        return;
      }

      users.forEach((user) => {
        const isActive = activeChatUserId === user.id;
        const div = document.createElement("div");
        // Highlight active user
        div.className = `conversation-item p-3 d-flex align-items-center ${isActive ? "bg-white bg-opacity-10 border-start border-4 border-primary" : "border-bottom border-white-10"}`;
        div.style.cursor = "pointer";
        div.onclick = () => selectConversation(user);

        div.innerHTML = `
                <div class="ratio ratio-1x1 rounded-circle me-3 position-relative" style="width: 45px;">
                    <img src="${user.profileImage || `https://ui-avatars.com/api/?name=${user.name}&background=random`}" 
                            class="rounded-circle object-fit-cover shadow-sm">
                    <!-- Online indicator placeholder -->
                    <span class="position-absolute bottom-0 end-0 bg-success border border-dark rounded-circle" style="width: 10px; height: 10px;"></span>
                </div>
                <div class="overflow-hidden">
                    <h6 class="mb-0 text-white text-truncate">${user.name}</h6>
                    <small class="text-white-50 text-truncate d-block">Click to chat</small>
                </div>
            `;
        list.appendChild(div);
      });
    }
  } catch (e) {
    console.error("Error loading conversations", e);
  }
}

function selectConversation(user) {
  if (activeChatUserId === user.id) return; // Don't reload if same

  activeChatUserId = user.id;
  lastMessageTimestamp = null; // Reset timestamp for new chat

  // Clear messages container immediately
  const container = document.getElementById("messagesContainer");
  if (container) {
    container.innerHTML =
      '<div class="text-center mt-5"><div class="spinner-border text-primary"></div></div>';
  }

  // Update Header
  document.getElementById("activeChatName").textContent = user.name;
  const statusEl = document.getElementById("activeChatStatus");
  if (statusEl) statusEl.textContent = "Online";

  const avatarContainer = document.getElementById("activeChatAvatar");
  if (avatarContainer) {
    avatarContainer.innerHTML = `
        <img src="${user.profileImage || `https://ui-avatars.com/api/?name=${user.name}&background=random`}" 
             class="rounded-circle object-fit-cover w-100 h-100">
    `;
  }

  // Enable Input
  const input = document.getElementById("messageInput");
  const btn = document.getElementById("sendBtn");
  if (input) input.disabled = false;
  if (btn) btn.disabled = false;

  // Highlight sidebar (re-render)
  loadConversations();

  // Load Messages & Start Polling
  loadMessages(true); // true = force scroll to bottom

  if (chatPollInterval) clearInterval(chatPollInterval);
  chatPollInterval = setInterval(() => loadMessages(false), 1000); // 1s polling
}

async function loadMessages(forceScroll = false) {
  if (!activeChatUserId) return;

  const container = document.getElementById("messagesContainer");
  if (!container) return;

  try {
    let url = `${API_URL}/messages/${activeChatUserId}`;
    if (lastMessageTimestamp) {
      url += `?after=${lastMessageTimestamp}`;
    }

    const response = await authFetch(url);
    if (response.ok) {
      const messages = await response.json();

      if (messages.length === 0) {
        // If first load (no timestamp) and no messages, show placeholder
        if (
          !lastMessageTimestamp &&
          container.innerHTML.includes("spinner-border")
        ) {
          container.innerHTML = `
                    <div class="text-center text-white-50 mt-5 animate-fade-in">
                        <i class="fas fa-hand-sparkles fa-3x mb-3 text-primary"></i>
                        <p>Start the conversation with a friendly "Hello!"</p>
                    </div>`;
        }
        return;
      }

      // If we are loading fresh (no timestamp), clear container
      if (!lastMessageTimestamp) {
        container.innerHTML = "";
      }

      const currentUser = JSON.parse(localStorage.getItem("user"));

      messages.forEach((msg) => {
        // Prevent duplicates just in case (though timestamp should handle it)
        // basic id check if we added ids to DOM? No, just trust timestamp for now.

        const isSent = msg.sender.id === currentUser.id;
        const div = document.createElement("div");
        div.className = `message-bubble ${isSent ? "message-sent bg-gradient-primary text-white ms-auto" : "message-received bg-glass text-white me-auto"} animate-fade-in`;

        const time = new Date(msg.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        div.innerHTML = `
                <div class="mb-1">${msg.content}</div>
                <div class="text-end" style="font-size: 0.7em; opacity: 0.7; margin-top: 4px;">
                    ${time} <i class="fas ${isSent ? "fa-check-double" : ""}"></i>
                </div>
            `;
        container.appendChild(div);
      });

      // Update Timestamp to the latest message
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.timestamp) {
        lastMessageTimestamp = lastMsg.timestamp;
      }

      // Auto-scroll
      if (forceScroll || messages.length > 0) {
        container.scrollTop = container.scrollHeight;
      }

      // Update badge immediately after reading
      updateUnreadCount();
    }
  } catch (e) {
    console.error("Error loading messages", e);
  }
}

// Send Message
// Send Message
const messageForm = document.getElementById("messageForm");
if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("messageInput");
    const content = input.value.trim();
    if (!content || !activeChatUserId) return;

    try {
      const response = await authFetch(
        `${API_URL}/messages/${activeChatUserId}`,
        {
          method: "POST",
          body: JSON.stringify({ content: content }),
        },
      );

      if (response.ok) {
        input.value = "";
        loadMessages(true); // Immediate fetch of the new message
      } else {
        console.error("Failed to send message", response.status);
        alert("Failed to send message. Please try again.");
      }
    } catch (e) {
      console.error("Error sending message", e);
      alert("Error sending message.");
    }
  });
}

// ---- Request Functions ----

async function loadRequestsPage() {
  loadMyRequests();
  loadIncomingRequests();
}

async function loadMyRequests() {
  const container = document.getElementById("sentRequestsContainer");
  if (!container) return;

  try {
    const response = await authFetch(`${API_URL}/requests/my-requests`);
    if (response.ok) {
      const requests = await response.json();
      container.innerHTML = "";

      if (requests.length === 0) {
        container.innerHTML =
          '<p class="text-white-50 text-center w-100">You haven\'t sent any requests.</p>';
        return;
      }

      requests.forEach((req) => {
        const room = req.room;
        const statusColor =
          req.status === "ACCEPTED"
            ? "success"
            : req.status === "REJECTED"
              ? "danger"
              : "warning";

        const div = document.createElement("div");
        div.className = "col-lg-6";
        div.innerHTML = `
                    <div class="glass-card p-3 d-flex align-items-center gap-3">
                        <img src="${room.imageUrl || "https://via.placeholder.com/100"}" class="rounded" style="width: 80px; height: 80px; object-fit: cover;">
                        <div class="flex-grow-1">
                            <h5 class="mb-1">₹${room.rent} - ${room.location}</h5>
                            <span class="badge bg-${statusColor}">${req.status}</span>
                        </div>
                        <a href="rooms.html" class="btn btn-sm btn-outline-light">View Room</a>
                    </div>
                `;
        container.appendChild(div);
      });
    }
  } catch (e) {
    console.error("Error loading my requests", e);
  }
}
// ---- Homepage Functions ----

// 1. Smart Search Handler (REMOVED)
// const searchForm = document.querySelector("#smart-search form"); ...

// 2. Load Featured Matches (On Homepage)
// 2. Load Featured Matches (On Homepage)
async function loadFeaturedMatches() {
  const container = document.querySelector("#featured-matches-container");
  const section = document.getElementById("featured-matches-section");
  if (!container || !section) return;

  try {
    const response = await fetch(`${API_URL}/matches/featured`);

    let matches = [];
    if (response.ok) {
      matches = await response.json();
    }

    // Identify if backend has no featured matches endpoint yet
    // Since we removed the dummy data, if matches is empty, we hide the section.

    container.innerHTML = "";

    if (matches.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";

    matches.forEach((match) => {
      const div = document.createElement("div");
      div.className = "col-md-4 animate-fade-in";
      // Check if user exists, if not use placeholder
      const u = match.user || {};
      const name = u.name || "User";
      const age = u.age || "?";
      const city = u.city || "Unknown";
      const img =
        u.profileImage ||
        `https://ui-avatars.com/api/?name=${name}&background=random`;
      const rent = match.rent || 0;
      const badges = match.badges || [];

      div.innerHTML = `
                <div class="glass-card feature-card p-3 h-100 position-relative hover-lift">
                    <img src="${img}" class="feature-img" alt="${name}">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                            <h4 class="mb-0 text-white">${name}, ${age}</h4>
                            <span class="badge bg-success rounded-pill">${match.score}% Match</span>
                    </div>
                    <p class="text-white-50 mb-2"><i class="fas fa-map-marker-alt me-2"></i>${city}</p>
                    <p class="fw-bold text-primary mb-3">₹${rent} / mo</p>
                    
                    <div class="d-flex gap-2 mb-4 flex-wrap">
                        ${badges.map((b) => `<span class="badge bg-white bg-opacity-10 rounded-pill fw-normal">${b}</span>`).join("")}
                    </div>
                    
                    <button class="btn btn-primary-custom w-100 rounded-pill" onclick="window.location.href='login.html'">Connect</button>
                </div>
            `;
      container.appendChild(div);
    });
  } catch (e) {
    console.error("Error loading featured matches", e);
    // Hide section on error
    if (section) section.style.display = "none";
  }
}

// Initialize Homepage
if (
  window.location.pathname.endsWith("index.html") ||
  window.location.pathname === "/"
) {
  document.addEventListener("DOMContentLoaded", loadFeaturedMatches);
}

async function loadIncomingRequests() {
  const container = document.getElementById("incomingRequestsContainer");
  if (!container) return;

  try {
    const response = await authFetch(`${API_URL}/requests/incoming`);
    if (response.ok) {
      const requests = await response.json();
      container.innerHTML = "";

      if (requests.length === 0) {
        container.innerHTML =
          '<p class="text-white-50 text-center w-100">No incoming requests.</p>';
        return;
      }

      requests.forEach((req) => {
        const user = req.requester;
        const room = req.room;
        const isPending = req.status === "PENDING";

        const div = document.createElement("div");
        div.className = "col-lg-6";
        div.innerHTML = `
            <div class="glass-card p-3">
                <div class="d-flex align-items-center gap-3 mb-3">
                    <img src="${user.profileImage || `https://ui-avatars.com/api/?name=${user.name}`}" class="rounded-circle" style="width: 50px; height: 50px;">
                    <div>
                        <h6 class="mb-0">${user.name}</h6>
                        <small class="text-white-50">Applied for: ${room.roomType} in ${room.location}</small>
                    </div>
                    <span class="badge bg-secondary ms-auto">${req.status}</span>
                </div>
                <div class="d-flex gap-2">
                    ${
                      isPending
                        ? `
                        <button class="btn btn-success btn-sm flex-grow-1" onclick="updateRequest(${req.id}, 'ACCEPTED')">Accept</button>
                        <button class="btn btn-danger btn-sm flex-grow-1" onclick="updateRequest(${req.id}, 'REJECTED')">Reject</button>
                        `
                        : `<small class="text-white-50 w-100 text-center">Action taken</small>`
                    }
                    <button class="btn btn-secondary-custom btn-sm" onclick="startChat(${user.id})"><i class="fas fa-comment"></i></button>
                </div>
            </div>
        `;
        container.appendChild(div);
      });
    }
  } catch (e) {
    console.error("Error loading incoming requests", e);
  }
}

window.updateRequest = async function (requestId, status) {
  if (
    !confirm(`Are you sure you want to ${status.toLowerCase()} this request?`)
  )
    return;

  try {
    const response = await authFetch(
      `${API_URL}/requests/${requestId}/status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status }),
      },
    );

    if (response.ok) {
      loadIncomingRequests(); // Refresh
    } else {
      alert("Failed to update status");
    }
  } catch (e) {
    console.error(e);
  }
};

window.startChat = function (userId) {
  localStorage.setItem("startChatUserId", userId);
  window.location.href = "chat.html";
};

// Initialize Chat Page Logic
if (window.location.pathname.endsWith("chat.html")) {
  document.addEventListener("DOMContentLoaded", () => {
    loadConversations();

    // Check if we need to start a chat from another page
    const targetId = localStorage.getItem("startChatUserId");
    if (targetId) {
      localStorage.removeItem("startChatUserId");

      // Check if already in list
      const existing = document.querySelector(
        `[onclick*="selectConversation"][onclick*="${targetId}"]`,
      );
      if (existing) {
        existing.click();
      } else {
        // Fetch user and add to list
        authFetch(`${API_URL}/user/${targetId}`)
          .then((res) => res.json())
          .then((user) => {
            const list = document.getElementById("conversationsList");
            if (list) {
              // If list has "No conversations yet", clear it
              if (list.innerText.includes("No conversations yet"))
                list.innerHTML = "";

              const div = document.createElement("div");
              div.className = `conversation-item p-3 d-flex align-items-center border-bottom border-white-10`;
              div.style.cursor = "pointer";
              div.onclick = () => selectConversation(user);
              div.innerHTML = `
                    <div class="ratio ratio-1x1 rounded-circle me-3 position-relative" style="width: 45px;">
                        <img src="${user.profileImage || `https://ui-avatars.com/api/?name=${user.name}&background=random`}" 
                                class="rounded-circle object-fit-cover shadow-sm">
                        <span class="position-absolute bottom-0 end-0 bg-success border border-dark rounded-circle" style="width: 10px; height: 10px;"></span>
                    </div>
                    <div class="overflow-hidden">
                        <h6 class="mb-0 text-white text-truncate">${user.name}</h6>
                        <small class="text-white-50 text-truncate d-block">Click to chat</small>
                    </div>
                `;
              list.prepend(div); // Add to top
              selectConversation(user);
            }
          })
          .catch((err) => console.error("Error fetching user for chat", err));
      }
    }
  });
}
async function initializeChatWith(userId) {
  activeChatUserId = userId;
  try {
    alert("Please select the user from the sidebar to chat.");
  } catch (e) {}
}

// Initialize Requests Page
if (window.location.pathname.endsWith("requests.html")) {
  document.addEventListener("DOMContentLoaded", loadRequestsPage);
}

// ---- Notification Functions ----

async function updateUnreadCount() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const response = await authFetch(`${API_URL}/messages/unread-count`);
    if (response.ok) {
      const data = await response.json();
      const count = data.count;

      const badge = document.getElementById("unread-badge");
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? "99+" : count;
          badge.classList.remove("d-none");
        } else {
          badge.classList.add("d-none");
        }
      }
    }
  } catch (error) {
    console.error("Error fetching unread count", error);
  }
}

async function updateRequestUnreadCount() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const response = await authFetch(`${API_URL}/requests/incoming/count`);
    if (response.ok) {
      const data = await response.json();
      const count = data.count;

      const badge = document.getElementById("request-unread-badge");
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? "99+" : count;
          badge.classList.remove("d-none");
        } else {
          badge.classList.add("d-none");
        }
      }
    }
  } catch (error) {
    console.error("Error fetching incoming request count", error);
  }
}

// ---- Report Functions ----

window.openReportModal = function (userId = null) {
  // If no userId passed, try to get from current context (e.g. active chat or active modal)
  if (!userId) {
    // Check if we are in dashboard modal
    const modalUserId = document.getElementById("modalUserId")?.value; // We need to ensure we set this in showMatchDetails
    if (modalUserId) userId = modalUserId;

    // Check if we are in chat
    if (!userId && typeof activeChatUserId !== "undefined") {
      userId = activeChatUserId;
    }
  }

  if (!userId) {
    alert("User not found to report.");
    return;
  }

  document.getElementById("reportUserId").value = userId;
  const modal = new bootstrap.Modal(document.getElementById("reportUserModal"));
  modal.show();
};

const reportForm = document.getElementById("reportUserForm");
if (reportForm) {
  reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = document.getElementById("reportUserId").value;
    const reasonValue = document.getElementById("reportReason").value;
    const description = document.getElementById("reportDescription").value;

    const reason = `${reasonValue}: ${description}`;

    try {
      const response = await authFetch(`${API_URL}/reports/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason }),
      });

      if (response.ok) {
        alert("Report submitted successfully.");
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("reportUserModal"),
        );
        modal.hide();
        reportForm.reset();
      } else {
        alert("Failed to submit report.");
      }
    } catch (e) {
      console.error("Error submitting report", e);
      alert("Error submitting report.");
    }
  });
}

// ---- Admin Dashboard Functions ----

async function loadAdminDashboard() {
  const container = document.getElementById("reportsTableBody");
  if (!container) return; // Not on admin page

  loadAdminStats();
  loadAdminUsers();
  loadAdminRooms();

  try {
    const response = await authFetch(`${API_URL}/reports`);
    if (!response.ok) throw new Error("Failed to fetch reports");

    const reports = await response.json();
    container.innerHTML = "";

    if (reports.length === 0) {
      container.innerHTML =
        '<tr><td colspan="6" class="text-center text-white-50">No reports found.</td></tr>';
      return;
    }

    reports.forEach((report) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-4">${new Date(report.createdAt).toLocaleDateString()}</td>
        <td>${report.reportedUser.name} (${report.reportedUser.email})</td>
        <td>${report.reason}</td>
        <td>${report.reportedBy.name}</td>
        <td><span class="badge bg-${report.status === "RESOLVED" ? "success" : report.status === "DISMISSED" ? "secondary" : "warning"}">${report.status}</span></td>
        <td class="text-end pe-4">
            ${
              report.status === "PENDING"
                ? `
            <button class="btn btn-sm btn-success me-1" onclick="updateReportStatus(${report.id}, 'RESOLVED')">Resolve</button>
            <button class="btn btn-sm btn-secondary me-1" onclick="updateReportStatus(${report.id}, 'DISMISSED')">Dismiss</button>
            `
                : ""
            }
            ${report.reportedUser.status === 'BLOCKED' ? 
                `<button class="btn btn-sm btn-success" onclick="unbanUser(${report.reportedUser.id})">Unban User</button>` : 
                `<button class="btn btn-sm btn-danger" onclick="banUser(${report.reportedUser.id})">Ban User</button>`
            }
            <button class="btn btn-sm btn-primary ms-1" onclick="startChat(${report.reportedUser.id})">Contact User</button>
        </td>
      `;
      container.appendChild(tr);
    });
  } catch (e) {
    console.error("Error loading reports", e);
    container.innerHTML =
      '<tr><td colspan="6" class="text-center text-danger">Error loading reports.</td></tr>';
  }
}

window.updateReportStatus = async function (reportId, status) {
  if (!confirm(`Mark report as ${status}?`)) return;
  try {
    const response = await authFetch(`${API_URL}/reports/${reportId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status }),
    });
    if (response.ok) {
      loadAdminDashboard();
    } else {
      alert("Failed to update status");
    }
  } catch (e) {
    console.error(e);
    alert("Error updating status");
  }
};

window.banUser = async function (userId) {
  if (
    !confirm(
      "Are you sure you want to BAN this user? This cannot be undone easily.",
    )
  )
    return;
  try {
    const response = await authFetch(`${API_URL}/reports/ban/${userId}`, {
      method: "POST",
    });
    if (response.ok) {
      alert("User has been banned.");
      loadAdminDashboard();
    } else {
      alert("Failed to ban user.");
    }
  } catch (e) {
    console.error(e);
    alert("Error banning user.");
  }
};

window.unbanUser = async function (userId) {
  if (
    !confirm(
      "Are you sure you want to UNBAN this user?",
    )
  )
    return;
  try {
    const response = await authFetch(`${API_URL}/reports/unban/${userId}`, {
      method: "POST",
    });
    if (response.ok) {
      alert("User has been unbanned.");
      loadAdminDashboard(); // This calls loadAdminUsers inside
    } else {
      alert("Failed to unban user.");
    }
  } catch (e) {
    console.error(e);
    alert("Error unbanning user.");
  }
};

async function loadAdminUsers() {
  const container = document.getElementById("usersTableBody");
  if (!container) return;
  try {
    const response = await authFetch(`${API_URL}/admin/users`);
    if (!response.ok) throw new Error("Failed to fetch users");
    const users = await response.json();
    container.innerHTML = "";
    if (users.length === 0) {
      container.innerHTML = '<tr><td colspan="5" class="text-center text-white-50">No users found.</td></tr>';
      return;
    }
    users.forEach((user) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-4">${user.id}</td>
        <td>${user.name || "N/A"}</td>
        <td>${user.email}</td>
        <td><span class="badge bg-${user.status === 'BLOCKED' ? 'danger' : 'success'}">${user.status || 'ACTIVE'}</span></td>
        <td class="text-end pe-4">
            ${user.status === 'BLOCKED' ? 
                `<button class="btn btn-sm btn-success me-1" onclick="unbanUser(${user.id})">Unban</button>` : 
                `<button class="btn btn-sm btn-warning me-1" onclick="banUser(${user.id})">Ban</button>`
            }
            <button class="btn btn-sm btn-danger" onclick="deleteAdminUser(${user.id})">Delete</button>
        </td>
      `;
      container.appendChild(tr);
    });
  } catch (error) {
    container.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading users</td></tr>';
  }
}

async function loadAdminStats() {
  try {
    const response = await authFetch(`${API_URL}/admin/stats`);
    if (response.ok) {
      const stats = await response.json();
      document.getElementById("stat-users").textContent = stats.totalUsers;
      document.getElementById("stat-rooms").textContent = stats.totalRooms;
      document.getElementById("stat-reports").textContent = stats.pendingReports;
    }
  } catch (e) {
    console.error("Error loading admin stats", e);
  }
}

window.deleteAdminUser = async function(id) {
  if (confirm("Are you sure you want to delete this user?")) {
    try {
      const res = await authFetch(`${API_URL}/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("User deleted successfully.");
        loadAdminUsers();
      }
      else alert("Failed to delete user.");
    } catch (e) { alert("Error deleting user."); }
  }
};

async function loadAdminRooms() {
  const container = document.getElementById("roomsTableBody");
  if (!container) return;
  try {
    const response = await authFetch(`${API_URL}/admin/rooms`);
    if (!response.ok) throw new Error("Failed to fetch rooms");
    const rooms = await response.json();
    container.innerHTML = "";
    if (rooms.length === 0) {
      container.innerHTML = '<tr><td colspan="5" class="text-center text-white-50">No rooms found.</td></tr>';
      return;
    }
    rooms.forEach((room) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-4">${room.id}</td>
        <td>${room.owner ? room.owner.name : "N/A"}</td>
        <td>${room.location || "N/A"}</td>
        <td>₹${room.rent || 0}</td>
        <td class="text-end pe-4">
            <button class="btn btn-sm btn-danger" onclick="deleteAdminRoom(${room.id})">Delete</button>
        </td>
      `;
      container.appendChild(tr);
    });
  } catch (error) {
    container.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading rooms</td></tr>';
  }
}

window.deleteAdminRoom = async function(id) {
  if (confirm("Are you sure you want to delete this room?")) {
    try {
      const res = await authFetch(`${API_URL}/admin/rooms/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Room deleted successfully.");
        loadAdminRooms();
      }
      else alert("Failed to delete room.");
    } catch (e) { alert("Error deleting room."); }
  }
};
