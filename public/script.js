// Anniversary date - ngày kỷ niệm
const anniversaryDate = new Date("2022-10-20T00:00:00");

// Calculate days between two dates
function calculateDaysTogether() {
    const today = new Date();
    const timeDifference = today - anniversaryDate;
    const daysTogether = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    return daysTogether;
}

// Update counter display
function updateCounterDisplay() {
    const daysCountElement = document.getElementById("daysCount");
    if (daysCountElement) {
        const days = calculateDaysTogether();

        // Only update if the value changed
        if (daysCountElement.textContent !== days.toString()) {
            daysCountElement.textContent = days;

            // Add animation when day changes
            daysCountElement.style.animation = "none";
            setTimeout(() => {
                daysCountElement.style.animation = "pulse 0.6s ease-in-out";
            }, 10);
        }
    }
}

// Fetch anniversary data from API (only once on page load)
async function fetchAnniversaryData() {
    try {
        console.log("📡 Fetching anniversary data from API (one-time call)...");
        const response = await fetch("/api/anniversary");
        const data = await response.json();

        // You can use API data if needed, or just rely on client-side calculation
        console.log("✅ Anniversary data loaded:", data);
        console.log(
            "💡 From now on, counter will update automatically without API calls!"
        );

        // Update display immediately
        updateCounterDisplay();
    } catch (error) {
        console.error("❌ Error fetching anniversary data:", error);
        console.log("🔄 Using fallback: client-side calculation");

        // Fallback to client-side calculation if API fails
        updateCounterDisplay();
    }
} // Add pulse animation
const style = document.createElement("style");
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);

// Initialize counter on page load
fetchAnniversaryData();

// Check for day change every hour instead of every second (reduces load)
// This checks if the day has changed and updates accordingly
setInterval(() => {
    console.log("⏰ Hourly check - updating counter...");
    updateCounterDisplay();
}, 60 * 60 * 1000); // Every hour

// Also check at midnight to update immediately when day changes
function scheduleNextMidnightCheck() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 1, 0); // 00:00:01 tomorrow

    const timeUntilMidnight = tomorrow - now;
    const hours = Math.floor(timeUntilMidnight / (1000 * 60 * 60));
    const minutes = Math.floor(
        (timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60)
    );

    console.log(`🌙 Next midnight update scheduled in ${hours}h ${minutes}m`);

    setTimeout(() => {
        console.log("🎉 Midnight! Updating counter for new day...");
        updateCounterDisplay();
        scheduleNextMidnightCheck(); // Schedule next midnight check
    }, timeUntilMidnight);
}

scheduleNextMidnightCheck(); // Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
            target.scrollIntoView({ behavior: "smooth" });

            // Close mobile menu after clicking a link
            const navMenu = document.querySelector(".nav-menu");
            const navToggle = document.querySelector(".nav-toggle");
            if (navMenu && navToggle) {
                navMenu.classList.remove("active");
                navToggle.classList.remove("active");
            }
        }
    });
});

// Hamburger menu toggle
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");

if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
        navMenu.classList.toggle("active");
        navToggle.classList.toggle("active");
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove("active");
            navToggle.classList.remove("active");
        }
    });
}

// Add scroll animation for elements
const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -100px 0px",
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
        }
    });
}, observerOptions);

document.querySelectorAll(".gallery-item, .timeline-item").forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
});
