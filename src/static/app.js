document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const signupContainer = document.getElementById("signup-container");
  const teacherAccountButton = document.getElementById("teacher-account-button");
  const teacherAccountLabel = document.getElementById("teacher-account-label");
  const teacherDialog = document.getElementById("teacher-dialog");
  const teacherDialogClose = document.getElementById("teacher-dialog-close");
  const teacherLoginForm = document.getElementById("teacher-login-form");
  const teacherLogoutButton = document.getElementById("teacher-logout-button");
  const teacherAuthMessage = document.getElementById("teacher-auth-message");
  let isTeacher = false;

  function showMessage(element, message, kind) {
    element.textContent = message;
    element.className = kind;
    element.classList.remove("hidden");
  }

  async function refreshTeacherState() {
    try {
      const response = await fetch("/auth/status");
      const status = await response.json();
      isTeacher = response.ok && status.authenticated;
      teacherAccountLabel.textContent = isTeacher
        ? `Teacher: ${status.username}`
        : "Teacher login";
      teacherAccountButton.setAttribute(
        "aria-label",
        isTeacher ? `Teacher account: ${status.username}` : "Teacher login"
      );
      signupContainer.classList.toggle("hidden", !isTeacher);
      teacherLoginForm.classList.toggle("hidden", isTeacher);
      teacherLogoutButton.classList.toggle("hidden", !isTeacher);
    } catch (error) {
      isTeacher = false;
      signupContainer.classList.add("hidden");
      teacherLoginForm.classList.remove("hidden");
      teacherLogoutButton.classList.add("hidden");
      console.error("Error checking teacher session:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
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
    if (!isTeacher) return;

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(messageDiv, result.detail || "An error occurred", "error");
        if (response.status === 401) await refreshTeacherState();
      }

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      showMessage(messageDiv, "Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isTeacher) return;

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(messageDiv, result.detail || "An error occurred", "error");
        if (response.status === 401) await refreshTeacherState();
      }

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      showMessage(messageDiv, "Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  teacherAccountButton.addEventListener("click", () => teacherDialog.showModal());
  teacherDialogClose.addEventListener("click", () => teacherDialog.close());

  teacherLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(teacherLoginForm);
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      const result = await response.json();
      if (!response.ok) {
        showMessage(teacherAuthMessage, result.detail || "Sign-in failed.", "error");
        return;
      }
      teacherLoginForm.reset();
      teacherAuthMessage.classList.add("hidden");
      await refreshTeacherState();
      teacherDialog.close();
      await fetchActivities();
    } catch (error) {
      showMessage(teacherAuthMessage, "Unable to sign in. Please try again.", "error");
      console.error("Error signing in:", error);
    }
  });

  teacherLogoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign-out failed");
      await refreshTeacherState();
      teacherDialog.close();
      await fetchActivities();
    } catch (error) {
      showMessage(teacherAuthMessage, "Unable to sign out. Please try again.", "error");
      console.error("Error signing out:", error);
    }
  });

  async function initialize() {
    await refreshTeacherState();
    await fetchActivities();
  }

  initialize();
});
