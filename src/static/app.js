document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const authBtn = document.getElementById("auth-btn");
  const authText = document.getElementById("auth-text");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const closeModal = document.querySelector(".close");
  const signupBtn = document.getElementById("signup-btn");
  const authRequiredMessage = document.getElementById("auth-required-message");

  // Authentication state
  let authCredentials = null;
  let isAuthenticated = false;

  // Modal controls
  authBtn.addEventListener("click", () => {
    if (isAuthenticated) {
      // Logout
      logout();
    } else {
      // Show login modal
      loginModal.style.display = "block";
    }
  });

  closeModal.addEventListener("click", () => {
    loginModal.style.display = "none";
    loginForm.reset();
    loginMessage.classList.add("hidden");
  });

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.style.display = "none";
      loginForm.reset();
      loginMessage.classList.add("hidden");
    }
  });

  // Handle login
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Store credentials for Basic Auth
    authCredentials = btoa(`${username}:${password}`);

    try {
      const response = await fetch("/auth/verify", {
        method: "POST",
        headers: {
          Authorization: `Basic ${authCredentials}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        isAuthenticated = true;
        authBtn.classList.add("logged-in");
        authText.textContent = `Logout (${result.username})`;
        loginModal.style.display = "none";
        loginForm.reset();
        updateUIForAuthState();
        showMessage(loginMessage, `Welcome, ${result.username}!`, "success");
      } else {
        showMessage(loginMessage, "Invalid username or password", "error");
        authCredentials = null;
      }
    } catch (error) {
      showMessage(loginMessage, "Login failed. Please try again.", "error");
      authCredentials = null;
      console.error("Login error:", error);
    }
  });

  // Logout function
  function logout() {
    authCredentials = null;
    isAuthenticated = false;
    authBtn.classList.remove("logged-in");
    authText.textContent = "Login";
    updateUIForAuthState();
    messageDiv.textContent = "Logged out successfully";
    messageDiv.className = "success";
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 3000);
  }

  // Update UI based on authentication state
  function updateUIForAuthState() {
    if (isAuthenticated) {
      signupBtn.disabled = false;
      authRequiredMessage.style.display = "none";
      // Show delete buttons
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.style.display = "inline-block";
      });
    } else {
      signupBtn.disabled = true;
      authRequiredMessage.style.display = "block";
      // Hide delete buttons
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.style.display = "none";
      });
    }
  }

  // Helper function to show messages
  function showMessage(element, text, type) {
    element.textContent = text;
    element.className = type;
    element.classList.remove("hidden");
    setTimeout(() => {
      element.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Clear and repopulate activity select
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li>
                        <span class="participant-email">${email}</span>
                        <button class="delete-btn" data-activity="${name}" data-email="${email}" style="display: ${isAuthenticated ? 'inline-block' : 'none'}">❌</button>
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!confirm(`Remove ${email} from ${activity}?`)) {
      return;
    }

    try {
      const response = await fetch(`/activities/${activity}/unregister`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authCredentials}`,
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        await fetchActivities();
      } else {
        showMessage(
          messageDiv,
          result.detail || "Failed to remove student from activity",
          "error"
        );
      }
    } catch (error) {
      showMessage(
        messageDiv,
        "An error occurred while removing the student. Please try again.",
        "error"
      );
      console.error("Error unregistering student:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!activity) {
      showMessage(messageDiv, "Please select an activity", "error");
      return;
    }

    try {
      const response = await fetch(`/activities/${activity}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authCredentials}`,
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(
          messageDiv,
          result.detail || "An error occurred",
          "error"
        );
      }
    } catch (error) {
      showMessage(
        messageDiv,
        "Failed to sign up. Please try again.",
        "error"
      );
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
  updateUIForAuthState();
});
