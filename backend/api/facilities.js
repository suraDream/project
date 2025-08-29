const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middlewares/auth");

const uploadDir = path.join(__dirname, "..", "uploads", "field_fac");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const name = `${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); 


router.get("/:field_id", async (req, res) => {
  const { field_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT field_fac_id, field_id, fac_name, fac_price, quantity_total, description, image_path
       FROM field_facilities
       WHERE field_id = $1
       ORDER BY field_fac_id`,
      [field_id]
    );
    return res.status(200).json({ success: true, data: result.rows || [] });
  } catch (err) {
    console.error("GET /facilities/:field_id error:", err);
    return res.status(500).json({ success: false, data: [], error: "Database error fetching field facilities" });
  }
});


// POST /:field_id -> เพิ่ม (หรือหลายรายการ) ลงใน field_facilities
// รองรับ:
// - application/json  { fac_name, fac_price, quantity_total, description }
// - or { selectedFacilities: { key: { fac_name, fac_price, quantity_total, description } } }
// - multipart/form-data with "data" (JSON string) and optional single file "facility_image"
router.post("/:field_id", upload.single("facility_image"), async (req, res) => {
  const { field_id } = req.params;
  let payload = req.body;

  try {
    // ถ้า multipart/form-data
    if (req.is("multipart/form-data") && req.body?.data) {
      try {
        payload = JSON.parse(req.body.data); // แปลง JSON string จาก frontend
      } catch (e) { }
    }

    // ตรวจสอบว่ามีข้อมูล facility เดี่ยว
    const { fac_name, fac_price = 0, quantity_total = 1, description = null } = payload;
    if (!fac_name) {
      return res.status(400).json({ success: false, error: "No facility data provided" });
    }

    const image_path = req.file ? `/uploads/field_fac/${req.file.filename}` : null;

    // insert ลง database
    const q = `
      INSERT INTO field_facilities
        (field_id, fac_name, fac_price, quantity_total, description, image_path)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`;
    const values = [field_id, fac_name, Number(fac_price), Number(quantity_total), description, image_path];
    const r = await pool.query(q, values);

    return res.status(201).json({ success: true, inserted: r.rows[0] });
  } catch (err) {
    console.error("POST /facilities/:field_id error:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
});



router.post("/add", authMiddleware, async (req, res) => {
  let { fac_name } = req.body;

  if (!fac_name || fac_name.trim() === "") {
    return res.status(400).json({ error: "Facility name is required" });
  }

  fac_name = fac_name.trim();

  const existingFacility = await pool.query(
    "SELECT * FROM facilities WHERE fac_name = $1",
    [fac_name]
  );

  if (existingFacility.rowCount > 0) {
    return res.status(400).json({ error: "สิ่งอำนวยความสะดวกนี้มีอยู่แล้ว" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO facilities (fac_name) VALUES ($1) RETURNING *",
      [fac_name]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Database error adding facility" });
  }
});

router.delete("/delete/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM facilities WHERE fac_id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Facility not found" });
    }

    res.json({ message: "Facility deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Database error deleting facility" });
  }
});

router.put("/update/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  let { fac_name } = req.body;
  fac_name = fac_name?.trim();

  if (!fac_name) {
    return res.status(400).json({ error: "Facility name is required" });
  }

  const existingFacility = await pool.query(
    "SELECT * FROM facilities WHERE fac_name = $1 AND fac_id != $2",
    [fac_name, id]
  );

  if (existingFacility.rowCount > 0) {
    return res.status(400).json({ error: "สิ่งอำนวยความสะดวกนี้มีอยู่แล้ว" });
  }

  try {
    const result = await pool.query(
      "UPDATE facilities SET fac_name = $1 WHERE fac_id = $2 RETURNING *",
      [fac_name, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Facility not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Database error updating facility" });
  }
});

router.get("/:field_id", async (req, res) => {
  const { field_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT  ff.field_fac_id,f.fac_id, f.fac_name, ff.fac_price
       FROM field_facilities ff
       INNER JOIN facilities f ON ff.facility_id = f.fac_id
       WHERE ff.field_id = $1`,
      [field_id]
    );

    if (result.rows.length === 0) {
      return res
        .status(200)
        .json({ message: "No facilities found for this field." });
    }

    res.status(200).json({ data: result.rows });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error fetching facilities" });
  }
});

router.get('/availability/:field_id/:bookingDate/:slots', async (req, res) => {
  const { field_id, bookingDate, slots } = req.params;
  try {
    // Express decode มาให้แล้ว แต่เผื่อไว้
    const selectedSlots = decodeURIComponent(slots).split(',').map(s => s.trim()).filter(Boolean);

    const bookings = await pool.query(
      `SELECT bf.field_fac_id, ff.fac_name, ff.fac_price, ff.quantity_total, SUM(bf.quantity) AS booked
       FROM booking_fac bf
       JOIN bookings b ON bf.booking_id = b.booking_id
       JOIN field_facilities ff ON bf.field_fac_id = ff.field_fac_id
       WHERE b.field_id = $1
         AND b.status IN ('pending','confirmed')
         AND b.booking_date = $2
         AND b.selected_slots && $3
       GROUP BY bf.field_fac_id, ff.fac_name, ff.fac_price, ff.quantity_total`,
      [field_id, bookingDate, selectedSlots]
    );

    const facilities = await pool.query(
      `SELECT field_fac_id, fac_name, fac_price, quantity_total
       FROM field_facilities
       WHERE field_id = $1`,
      [field_id]
    );

    const result = facilities.rows.map(fac => {
      const bookedRow = bookings.rows.find(b => b.field_fac_id === fac.field_fac_id);
      const booked = bookedRow ? Number(bookedRow.booked) : 0;
      return {
        field_fac_id: fac.field_fac_id,
        fac_name: fac.fac_name,
        fac_price: fac.fac_price,
        quantity_total: fac.quantity_total,
        available: Math.max(0, fac.quantity_total - booked),
      };
    });

    res.status(200).json(result);
    console.log("Facility availability result:", result);

  } catch (err) {
    console.error("Facility availability error:", err);
    res.status(500).json({ error: err.message || "เกิดข้อผิดพลาด" });
  }
});

module.exports = router;


