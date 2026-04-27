const express = require("express");
const db = require("../config/db");
const protect = require("../middlewares/authMiddleware");
const allowRoles = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const publicApiLimiter = require("../middlewares/rateLimitMiddleware");
const { getRedisClient } = require("../config/redis");

const {
  uploadContent,
  getMyContent,
  getAllContent
} = require("../controllers/contentController");

const {
  getActiveContentByRotation
} = require("../services/schedulingService");

const router = express.Router();

router.post(
  "/upload",
  protect,
  allowRoles("teacher"),
  upload.single("file"),
  uploadContent
);

router.get(
  "/my",
  protect,
  allowRoles("teacher"),
  getMyContent
);

router.get(
  "/all",
  protect,
  allowRoles("principal"),
  getAllContent
);

router.get("/analytics/subjects", protect, allowRoles("principal"), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        subject,
        COUNT(*) AS total_views
      FROM content_views
      GROUP BY subject
      ORDER BY total_views DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("ANALYTICS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics"
    });
  }
});

router.get("/live/:teacherId", publicApiLimiter, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { subject } = req.query;

    const redisClient = getRedisClient();
    const cacheKey = `live:${teacherId}:${subject || "all"}`;

if (redisClient) {
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    console.log("Serving from Redis cache");
    return res.json(JSON.parse(cachedData));
  }
}

    let query = `
      SELECT
        c.id,
        c.title,
        c.description,
        c.subject,
        c.file_path,
        c.file_type,
        c.file_size,
        c.start_time,
        c.end_time,
        c.created_at,
        cs.rotation_order,
        cs.duration
      FROM content c
      JOIN content_schedule cs ON c.id = cs.content_id
      WHERE c.uploaded_by = $1
      AND c.status = 'approved'
    `;

    const params = [teacherId];
    let count = 2;

    if (subject) {
      query += ` AND c.subject = $${count}`;
      params.push(subject.toLowerCase());
      count++;
    }

    query += " ORDER BY c.subject ASC, cs.rotation_order ASC";

    const result = await db.query(query, params);
    const contents = result.rows;

    if (contents.length === 0) {
      const response = {
        success: true,
        message: "No content available",
        data: null
      };

      if (redisClient) {
        await redisClient.setEx(cacheKey, 30, JSON.stringify(response));
      }

      return res.json(response);
    }

    let selectedContent = null;

    if (subject) {
      selectedContent = getActiveContentByRotation(contents);
    } else {
      const groupedBySubject = {};

      for (const item of contents) {
        if (!groupedBySubject[item.subject]) {
          groupedBySubject[item.subject] = [];
        }

        groupedBySubject[item.subject].push(item);
      }

      const subjects = Object.keys(groupedBySubject);

      for (const sub of subjects) {
        const active = getActiveContentByRotation(groupedBySubject[sub]);

        if (active) {
          selectedContent = active;
          break;
        }
      }
    }

    if (!selectedContent) {
      const response = {
        success: true,
        message: "No content available",
        data: null
      };

      if (redisClient) {
        await redisClient.setEx(cacheKey, 30, JSON.stringify(response));
      }

      return res.json(response);
    }

    await db.query(
      `INSERT INTO content_views (content_id, teacher_id, subject)
       VALUES ($1, $2, $3)`,
      [selectedContent.id, teacherId, selectedContent.subject]
    );

    const response = {
      success: true,
      message: "Live content found",
      data: {
        id: selectedContent.id,
        title: selectedContent.title,
        description: selectedContent.description,
        subject: selectedContent.subject,
        file_url: `${process.env.BASE_URL}${selectedContent.file_path}`,
        file_type: selectedContent.file_type,
        file_size: selectedContent.file_size,
        duration: selectedContent.duration,
        rotation_order: selectedContent.rotation_order
      }
    };

    if (redisClient) {
  await redisClient.setEx(cacheKey, 30, JSON.stringify(response));
}

return res.json(response);
  } catch (error) {
    console.error("LIVE CONTENT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch live content"
    });
  }
});

module.exports = router;