require("dotenv").config();
const express = require("express");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const ML_URL = process.env.ML_URL || "http://127.0.0.1:5000/infer";
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai-kavach";


// ======================
// MONGO
// ======================
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("Mongo Error:", err));


// ======================
// SCHEMAS
// ======================
const attackSchema = new mongoose.Schema(
  {
    src_ip: String,
    ts: Date,
    features: Object,
    ml: Object,
    raw: Object,
    geo: {
      lat: Number,
      lon: Number,
      country: String,
      city: String,
    },
  },
  { timestamps: true }
);

const iocSchema = new mongoose.Schema(
  {
    attackId: mongoose.Schema.Types.ObjectId,
    type: String,
    value: String,
    meta: Object,
  },
  { timestamps: true }
);

const Attack = mongoose.model("Attack", attackSchema);
const IOC = mongoose.model("IOC", iocSchema);


// ======================
// SOCKETS
// ======================
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () =>
    console.log("Client disconnected:", socket.id)
  );
});


// ======================
// HELPERS
// ======================
function normalizeML(ml) {
  if (!ml) return {};
  if (ml.severity) ml.severity = String(ml.severity).toLowerCase();
  return ml;
}


// ======================
// INGEST ENDPOINT
// ======================
app.post("/ingest", async (req, res) => {
  try {
    const features = req.body || {};

    // ------------------
    // ML INFERENCE
    // ------------------
    let ml = {};
    try {
      const { data } = await axios.post(ML_URL, features, { timeout: 3000 });
      ml = normalizeML(data?.ml || {});
    } catch (e) {
      console.warn("ML service unreachable:", e.message);
    }

    // ------------------
    // GEO NORMALIZATION
    // ------------------
    let geo = null;
    if (features.geo) {
      geo = {
        lat: features.geo.latitude ?? features.geo.lat ?? null,
        lon: features.geo.longitude ?? features.geo.lon ?? null,
        country: features.geo.country_name ?? features.geo.country ?? null,
        city: features.geo.city ?? null,
      };
    }

    // ------------------
    // STORE ATTACK
    // ------------------
    const attack = await Attack.create({
      src_ip: features.src_ip || "unknown",
      ts: new Date(),
      features,
      ml,
      raw: features.raw || {},
      geo,
    });

    // ==================================================
    // IoC EXTRACTION (ROBUST — THIS FIXES YOUR ISSUE)
    // ==================================================
    const iocList = [];
    let sampleText = "";

    // Prefer commands array if present and non-empty
    if (
      Array.isArray(features.raw?.commands) &&
      features.raw.commands.length > 0
    ) {
      sampleText = features.raw.commands.join(" ");
    }

    // Fallback: stringify raw payload
    if (!sampleText && features.raw) {
      sampleText = JSON.stringify(features.raw);
    }

    if (sampleText) {
      const files = sampleText.match(
        /\b[\w-]+\.(exe|sh|txt|php|py|bin)\b/gi
      );
      const urls = sampleText.match(/https?:\/\/[^\s]+/gi);

      if (files)
        files.forEach((f) =>
          iocList.push({ type: "file", value: f })
        );

      if (urls)
        urls.forEach((u) =>
          iocList.push({ type: "url", value: u })
        );
    }

    // Save IoCs (if any)
    let savedIocs = [];
    if (iocList.length > 0) {
      savedIocs = await IOC.insertMany(
        iocList.map((ioc) => ({
          attackId: attack._id,
          ...ioc,
        }))
      );
    }

    // ------------------
    // REALTIME EMIT
    // ------------------
    io.emit("attack", {
      attack: attack.toObject(),
      iocs: savedIocs.map((x) => x.toObject()),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("Ingest error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});


// ======================
// DELETE / RESET
// ======================
app.delete("/attack/:id", async (req, res) => {
  await Attack.deleteOne({ _id: req.params.id });
  await IOC.deleteMany({ attackId: req.params.id });
  io.emit("delete_attack", { id: req.params.id });
  res.json({ ok: true });
});

app.delete("/reset", async (_, res) => {
  await Attack.deleteMany({});
  await IOC.deleteMany({});
  io.emit("reset_attacks");
  res.json({ ok: true });
});


// ======================
// QUERY ROUTES
// ======================
app.get("/attacks", async (_, res) =>
  res.json(await Attack.find().sort({ createdAt: -1 }).limit(200))
);

app.get("/latest", async (_, res) =>
  res.json(await Attack.find().sort({ createdAt: -1 }).limit(20))
);

app.get("/iocs", async (_, res) =>
  res.json(await IOC.find().sort({ createdAt: -1 }).limit(200))
);

app.get("/", (_, res) =>
  res.json({ ok: true, service: "ai-kavach-backend", port: PORT })
);


// ======================
// START SERVER
// ======================
server.listen(PORT, () =>
  console.log(`AI-KAVACH backend running on port ${PORT}`)
);
