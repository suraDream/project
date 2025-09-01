const express = require("express");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middlewares/auth");

router.get("/booking/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await pool.query(
      `SELECT
        n.notify_id,
        n.sender_id,
        n.recive_id,
        n.topic,
        n.key_id,
        n.status,
        n.created_at,
        u_sender.first_name AS sender_first_name,
        u_sender.last_name AS sender_last_name,
        u_recive.first_name AS recive_first_name,
        u_recive.last_name AS recive_last_name,
        f.field_name,
        s.sub_field_name,
        b.booking_date,
        b.start_time,
        b.end_time
      FROM notifications n
      LEFT JOIN users u_sender ON n.sender_id = u_sender.user_id
      LEFT JOIN users u_recive ON n.recive_id = u_recive.user_id
      LEFT JOIN bookings b ON n.key_id = b.booking_id
      LEFT JOIN field f ON b.field_id = f.field_id
      LEFT JOIN sub_field s ON b.sub_field_id = s.sub_field_id
      WHERE n.key_id = $1
      ORDER BY n.created_at DESC`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No notification found" });
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



router.get("/post/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await pool.query(
      `SELECT
        n.notify_id,
        n.sender_id,
        n.recive_id,
        n.messages,
        n.topic,
        n.key_id,
        n.status,
        n.created_at,
        u_sender.first_name AS sender_first_name,
        u_sender.last_name AS sender_last_name,
        u_recive.first_name AS recive_first_name,
        u_recive.last_name AS recive_last_name,
        p.post_title,
        p.post_content
      FROM notifications n
      LEFT JOIN users u_sender ON n.sender_id = u_sender.user_id
      LEFT JOIN users u_recive ON n.recive_id = u_recive.user_id
      LEFT JOIN post p ON n.key_id = p.post_id
      WHERE n.key_id = $1 AND n.topic = 'post'
      ORDER BY n.created_at DESC`,
      [postId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No notification found" });
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/all/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT
        n.notify_id,
        n.sender_id,
        n.recive_id,
        n.topic,
        n.key_id,
        n.messages,
        n.status,
        n.created_at,
        u_sender.first_name AS sender_first_name,
        u_sender.last_name AS sender_last_name,
        u_recive.first_name AS recive_first_name,
        u_recive.last_name AS recive_last_name,
        f.field_name,
        s.sub_field_name,
        b.booking_date,
        b.start_time,
        b.end_time
      FROM notifications n
      LEFT JOIN users u_sender ON n.sender_id = u_sender.user_id
      LEFT JOIN users u_recive ON n.recive_id = u_recive.user_id
      LEFT JOIN bookings b ON n.key_id = b.booking_id
      LEFT JOIN field f ON b.field_id = f.field_id
      LEFT JOIN sub_field s ON b.sub_field_id = s.sub_field_id
      WHERE n.recive_id = $1
      ORDER BY n.created_at DESC`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No notifications found for this user" });
    }

      if(req){
      req.io.emit("new_notification", {
    topic: "reset_count",
    reciveId: Number(userId),
  });
}

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/read-notification", authMiddleware, async (req, res) => {
  try {
    const { key_id } = req.body;
    const id = parseInt(key_id);
    const user_id = req.user.user_id;
    const result = await pool.query(
      `UPDATE notifications
      SET status = 'read'
      WHERE key_id = $1 AND recive_id = $2`,
      [id, user_id]
    );
    const data = await pool.query(
      `SELECT * FROM notifications WHERE key_id = $1 AND recive_id = $2`,
      [id, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if(req){
      req.io.emit("new_notification", {
    notifyId: data.rows[0].notify_id,
    topic: "new_booking",
    reciveId: user_id,
    keyId: key_id,
  });}



    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/read-all-notification", authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const result = await pool.query(
      `UPDATE notifications
       SET status = 'read'
       WHERE recive_id = $1 AND status = 'unread'`,
      [user_id]
    );

    // query new unread count for this user
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS unread_count FROM notifications WHERE recive_id = $1 AND status = 'unread'`,
      [user_id]
    );
    const unreadCount = countResult.rows[0]?.unread_count ?? 0;

    // emit reset_count so frontend can set unread = 0 (หรือใช้ unreadCount)
    if (req && req.io) {
      req.io.emit("new_notification", {
        topic: "reset_count",
        reciveId: Number(user_id),
        unreadCount,
      });
    }

    res.status(200).json({ message: "Notifications marked as read", updated: result.rowCount, unreadCount });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
      


module.exports = router;