// import DB modules
const express = require("express");
const formidable = require("express-formidable");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
require("dotenv").config();
// Init server
const app = express();
app.use(formidable());

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// connect DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

// import routes
const userRoutes = require("./routes/user.js");
app.use(userRoutes);

const offerRoutes = require("./routes/offer.js");
app.use(offerRoutes);

app.all("*", (req, res) => {
  res.status(404).json({ message: "This route does not exist" });
});

// Launch server
app.listen(process.env.PORT, () => {
  console.log("Server Started");
});
