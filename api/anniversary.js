// Vercel Serverless Function
export default function handler(req, res) {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }

    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    // Calculate anniversary data
    const startDate = new Date("2022-10-20");
    const today = new Date();
    const daysCount = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    const data = {
        startDate: "20/10/2022",
        daysCount: daysCount,
        proposal: "Thế cậu đồng ý làm bạn gái tớ không?",
        timestamp: new Date().toISOString(),
    };

    // Set cache headers for better performance
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.setHeader("ETag", `"${daysCount}-${startDate.getTime()}"`);

    res.status(200).json(data);
}
