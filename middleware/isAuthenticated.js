const User = require("../models/User.js");
const isAuthenticated = async (req, res, next) => {
  if (!req.headers.authorization)
    return res.status(400).json({ error: { message: "No token found" } });

  const token = req.headers.authorization.replace("Bearer ", "");
  const user = await await User.findOne({ token: token });

  if (user) {
    req.user = user;
    return next();
  } else {
    return res.status(400).json({ error: { message: "Unothaurized" } });
  }
};

module.exports = isAuthenticated;
