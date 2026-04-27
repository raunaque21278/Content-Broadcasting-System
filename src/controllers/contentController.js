const db = require("../config/db");

const uploadContent = async (req, res) => {
  const client = await db.connect();

  try {
    const { title, description, subject, start_time, end_time, duration } = req.body;

    if (!title || !subject) {
      return res.status(400).json({
        success: false,
        message: "Title and subject are required"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required"
      });
    }

    if (!start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: "Start time and end time are required"
      });
    }

    if (new Date(start_time) >= new Date(end_time)) {
      return res.status(400).json({
        success: false,
        message: "End time must be greater than start time"
      });
    }

    await client.query("BEGIN");

    const normalizedSubject = subject.toLowerCase();
    const filePath = `/uploads/${req.file.filename}`;

    const contentResult = await client.query(
      `INSERT INTO content
      (title, description, subject, file_path, file_type, file_size, uploaded_by, start_time, end_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        title,
        description || null,
        normalizedSubject,
        filePath,
        req.file.mimetype,
        req.file.size,
        req.user.id,
        start_time,
        end_time
      ]
    );

    const contentId = contentResult.rows[0].id;

    let slotResult = await client.query(
      "SELECT id FROM content_slots WHERE subject = $1",
      [normalizedSubject]
    );

    let slotId;

    if (slotResult.rows.length === 0) {
      const newSlot = await client.query(
        "INSERT INTO content_slots (subject) VALUES ($1) RETURNING id",
        [normalizedSubject]
      );

      slotId = newSlot.rows[0].id;
    } else {
      slotId = slotResult.rows[0].id;
    }

    const orderResult = await client.query(
      "SELECT COALESCE(MAX(rotation_order), 0) AS max_order FROM content_schedule WHERE slot_id = $1",
      [slotId]
    );

    const nextOrder = Number(orderResult.rows[0].max_order) + 1;

    await client.query(
      `INSERT INTO content_schedule
      (content_id, slot_id, rotation_order, duration)
      VALUES ($1, $2, $3, $4)`,
      [contentId, slotId, nextOrder, Number(duration) || 5]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Content uploaded successfully and sent for approval",
      content_id: contentId
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Content upload failed"
    });
  } finally {
    client.release();
  }
};

const getMyContent = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        c.id,
        c.title,
        c.description,
        c.subject,
        c.file_path,
        c.file_type,
        c.file_size,
        c.status,
        c.rejection_reason,
        c.start_time,
        c.end_time,
        c.created_at,
        cs.rotation_order,
        cs.duration
      FROM content c
      LEFT JOIN content_schedule cs ON c.id = cs.content_id
      WHERE c.uploaded_by = $1
      ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch content"
    });
  }
};

const getAllContent = async (req, res) => {
  try {
    const { status, subject, teacher, page = 1, limit = 10 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT
        c.id,
        c.title,
        c.description,
        c.subject,
        c.file_path,
        c.file_type,
        c.file_size,
        c.status,
        c.rejection_reason,
        c.start_time,
        c.end_time,
        c.approved_at,
        c.created_at,
        u.name AS teacher_name,
        u.email AS teacher_email,
        p.name AS approved_by_name,
        cs.rotation_order,
        cs.duration
      FROM content c
      JOIN users u ON c.uploaded_by = u.id
      LEFT JOIN users p ON c.approved_by = p.id
      LEFT JOIN content_schedule cs ON c.id = cs.content_id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) 
      FROM content c
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];
    let count = 1;

    if (status) {
      query += ` AND c.status = $${count}`;
      countQuery += ` AND c.status = $${count}`;
      params.push(status);
      countParams.push(status);
      count++;
    }

    if (subject) {
      query += ` AND c.subject = $${count}`;
      countQuery += ` AND c.subject = $${count}`;
      params.push(subject.toLowerCase());
      countParams.push(subject.toLowerCase());
      count++;
    }

    if (teacher) {
      query += ` AND c.uploaded_by = $${count}`;
      countQuery += ` AND c.uploaded_by = $${count}`;
      params.push(teacher);
      countParams.push(teacher);
      count++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${count} OFFSET $${count + 1}`;
    params.push(Number(limit), offset);

    const result = await db.query(query, params);
    const countResult = await db.query(countQuery, countParams);

    res.json({
      success: true,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].count)
      },
      data: result.rows
    });
  } catch (error) {
    console.error("GET ALL CONTENT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch all content"
    });
  }
};

module.exports = {
  uploadContent,
  getMyContent,
  getAllContent
};