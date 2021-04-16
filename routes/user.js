// Import modules
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const express = require("express");
const cloudinary = require("cloudinary").v2;

// Init server & router
const router = express.Router();

//import models
const User = require("../models/User.js");

// --------------------------------- Signup route

router.post("/user/sign-up", async (req, res) => {
  try {
    // Destructure body
    const { email, username, phone, password } = req.fields;
    const user = await User.findOne({ email });

    // Manage quey response
    if (user)
      return res
        .status(409)
        .json({ error: { message: "email already exists" } });
    // Manage validation
    if (!username)
      return res
        .status(400)
        .json({ error: { message: "username is mandatory" } });

    // Pssword encryption
    const salt = uid2(16);
    const hash = SHA256(salt + password).toString(encBase64);
    // generate token
    const token = uid2(16);

    // Instanciate new User
    const newUser = new User({
      email,
      account: {
        username,
        phone,
        avatar: null,
      },
      token,
      hash,
      salt,
    });

    // Upload file in cloudinary
    const filePath = req.files.avatar.path;
    const uploadedFile = await cloudinary.uploader.upload(
      filePath,
      {
        folder: `/vinted/users/${newUser._id}`,
      },
      function (error, result) {
        console.log(error, result);
      }
    );

    newUser.account.avatar = uploadedFile;
    await newUser.save();

    res.status(200).json({
      _id: newUser._id,
      token: newUser.token,
      acount: newUser.account,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --------------------------------- Login route

router.post("/user/login", async (req, res) => {
  try {
    // Destructure body
    const { email, password } = req.fields;

    // Generate hash fo authentication
    const user = await User.findOne({ email });

    // manage query response
    if (!user)
      return res
        .status(400)
        .json({ error: { message: "invalid email or password" } });

    // generate hash
    const hash = SHA256(user.salt + password).toString(encBase64);

    // Manage server response
    user.hash === hash
      ? res.status(200).json({
          _id: user._id,
          token: user.token,
          acount: user.account,
        })
      : res
          .status(400)
          .json({ error: { message: "invalid email or password" } });

    // password Encryption
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
