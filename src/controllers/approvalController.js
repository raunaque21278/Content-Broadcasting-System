const db = require("../config/db");

const approveContent = async (req, res) => {
  try {
    const { id } = req.params;

    const contentResult = await db.query(
      "SELECT * FROM content WHERE id = $1",
      [id]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    await db.query(
      `UPDATE content
       SET status = 'approved',
           approved_by = $1,
           approved_at = CURRENT_TIMESTAMP,
           rejection_reason = NULL
       WHERE id = $2`,
      [req.user.id, id]
    );

    res.json({
      success: true,
      message: "Content approved successfully"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Approval failed"
    });
  }
};

const rejectContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required"
      });
    }

    const contentResult = await db.query(
      "SELECT * FROM content WHERE id = $1",
      [id]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    await db.query(
      `UPDATE content
       SET status = 'rejected',
           rejection_reason = $1,
           approved_by = NULL,
           approved_at = NULL
       WHERE id = $2`,
      [reason, id]
    );

    res.json({
      success: true,
      message: "Content rejected successfully"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Rejection failed"
    });
  }
};

module.exports = {
  approveContent,
  rejectContent
};