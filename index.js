require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dns = require("dns");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true,
  },
  short_url: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
});

const counterSchema = new mongoose.Schema({
  _id: {
    // the name of the counter
    type: String,
    required: true,
  },
  seq: {
    // the current sequence value
    type: Number,
    default: 0,
  },
});

const Url = mongoose.model("Url", urlSchema);
const Counter = mongoose.model("Counter", counterSchema);

async function getNextShortUrl() {
  const counter = await Counter.findOneAndUpdate(
    { _id: "url_count" }, // query
    { $inc: { seq: 1 } }, // increment seq by 1
    { new: true, upsert: true } // create doc if missing, return *after* update
  );
  return counter.seq; // this is your next short_url
}

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl", async (req, res) => {
  const { url_input } = req.body;

  try {
    // Check if url_input already exists
    let urlDoc = await Url.findOne({ original_url: url_input });

    if (!urlDoc) {
      const id = await getNextShortUrl();
      urlDoc = await Url.create({
        original_url: url_input,
        short_url: id,
      });
    }

    return res
      .status(201)
      .json({ original_url: urlDoc.original_url, short_url: urlDoc.short_url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/shorturl/:url_id", async (req, res) => {
  const url_id = req.params.url_id;

  try {
    const urlDoc = await Url.findOne({ short_url: url_id });
    const { original_url } = urlDoc;

    res.redirect(original_url);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
