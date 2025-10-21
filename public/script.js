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

// Add pulse animation
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
updateCounterDisplay();

// Check for day change every hour instead of every second (reduces load)
// This checks if the day has changed and updates accordingly
setInterval(() => {
    updateCounterDisplay();
}, 60 * 60 * 1000); // Every hour

// Also check at midnight to update immediately when day changes
function scheduleNextMidnightCheck() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 1, 0); // 00:00:01 tomorrow

    const timeUntilMidnight = tomorrow - now;

    setTimeout(() => {
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

// Background Music Control
const bgMusic = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");
const playIcon = document.querySelector(".play-icon");
const pauseIcon = document.querySelector(".pause-icon");

let isPlaying = false;

// Function to toggle music
function toggleMusic() {
    if (isPlaying) {
        bgMusic.pause();
        playIcon.classList.remove("hidden");
        pauseIcon.classList.add("hidden");
        musicToggle.classList.remove("playing");
    } else {
        bgMusic.play().catch((error) => {
            console.log("Autoplay prevented:", error);
        });
        playIcon.classList.add("hidden");
        pauseIcon.classList.remove("hidden");
        musicToggle.classList.add("playing");
    }
    isPlaying = !isPlaying;
}

// Add click event to toggle button
if (musicToggle && bgMusic) {
    musicToggle.addEventListener("click", toggleMusic);

    // Try to autoplay when user first interacts with the page
    document.addEventListener(
        "click",
        function initMusic() {
            if (!isPlaying) {
                toggleMusic();
            }
            document.removeEventListener("click", initMusic);
        },
        { once: true }
    );
}
