// backend/server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Helper 1: Extract farthest seat number (e.g., "A20" -> 20)
export function farthestSeatNumber(seatStr) {
  const seatNum = parseInt(seatStr.match(/\d+/)[0]);
  return seatNum;
}

// Helper 2: Compute boarding sequence
export function computeSequence(bookings) {
  return bookings
    .map((b) => ({
      ...b,
      farthest: Math.max(...b.Seats.map(farthestSeatNumber)),
    }))
    .sort((a, b) => {
      if (b.farthest !== a.farthest) return b.farthest - a.farthest;
      return a.Booking_ID - b.Booking_ID;
    })
    .map((b, i) => ({ Seq: i + 1, Booking_ID: b.Booking_ID }));
}

// Endpoint: health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "bus-boarding-backend" });
});

// Endpoint: sample bookings
app.get("/api/sample", (req, res) => {
  const sample = [
    { Booking_ID: 101, Seats: ["A1", "B1"] },
    { Booking_ID: 120, Seats: ["A20", "C2"] },
  ];
  res.json({ bookings: sample });
});

// Endpoint: compute sequence (JSON)
app.post("/api/compute", (req, res) => {
  const { bookings } = req.body;
  if (!bookings) return res.status(400).json({ error: "Missing bookings" });
  const sequence = computeSequence(bookings);
  res.json({ sequence });
});

// Endpoint: upload CSV file
app.post("/api/upload", upload.single("file"), (req, res) => {
  const bookings = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => {
      const seats = row.Seats.split(",").map((s) => s.trim());
      bookings.push({ Booking_ID: parseInt(row.Booking_ID), Seats: seats });
    })
    .on("end", () => {
      fs.unlinkSync(req.file.path);
      res.json({ bookings });
    });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
