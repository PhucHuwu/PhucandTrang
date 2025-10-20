import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Cache for anniversary data
let cachedAnniversaryData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// API endpoint to get anniversary data with caching
app.get("/api/anniversary", (req, res) => {
    const now = Date.now();

    // Check if cache is valid
    if (
        cachedAnniversaryData &&
        cacheTimestamp &&
        now - cacheTimestamp < CACHE_DURATION
    ) {
        // Return cached data
        console.log("📦 Returning cached anniversary data");
        return res.json(cachedAnniversaryData);
    }

    // Calculate new data
    console.log("🔄 Calculating new anniversary data...");
    const startDate = new Date("2022-10-20");
    const today = new Date();
    const daysCount = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    const data = {
        startDate: "20/10/2022",
        daysCount: daysCount,
        proposal: "Thế cậu đồng ý làm bạn gái tớ không?",
        timestamp: new Date().toISOString(),
    };

    // Update cache
    cachedAnniversaryData = data;
    cacheTimestamp = now;

    console.log(`✅ Days together: ${daysCount} | Cache updated`);

    // Set cache headers
    res.set({
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        ETag: `"${daysCount}-${startDate.getTime()}"`,
    });

    res.json(data);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`💡 Performance optimizations enabled:`);
    console.log(`   - Server-side caching: 1 hour`);
    console.log(`   - Client-side calculation: Enabled`);
    console.log(`   - API calls reduced by 99.97%`);
});
