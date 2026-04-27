const express = require("express");
const protect = require("../middlewares/authMiddleware");
const allowRoles = require("../middlewares/roleMiddleware");

const {
  approveContent,
  rejectContent
} = require("../controllers/approvalController");

const router = express.Router();

router.patch("/:id/approve", protect, allowRoles("principal"), approveContent);
router.patch("/:id/reject", protect, allowRoles("principal"), rejectContent);

module.exports = router;