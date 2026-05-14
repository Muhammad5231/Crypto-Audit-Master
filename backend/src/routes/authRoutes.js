const router = require("express").Router();
const User = require("../models/User");
const { signToken } = require("../utils/jwt");
const { auth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

function publicUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
  };
}

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Username, email and password are required.",
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        error: "Username must be at least 3 characters.",
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        error: "Username can only contain letters, numbers and underscore.",
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        error: "Please enter a valid email address.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters.",
      });
    }

    const usernameLower = username.toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ email }, { usernameLower }],
    });

    if (existingUser) {
      return res.status(409).json({
        error: "Username or email already exists.",
      });
    }

    const passwordHash = await User.hashPassword(password);

    const user = await User.create({
      username,
      usernameLower,
      email,
      passwordHash,
    });

    return res.status(201).json({
      user: publicUser(user),
      token: signToken(user),
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const emailOrUsername = String(
      req.body.emailOrUsername || req.body.email || ""
    ).trim();

    const password = String(req.body.password || "");

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        error: "Email/username and password are required.",
      });
    }

    const loginLower = emailOrUsername.toLowerCase();

    const user = await User.findOne({
      $or: [{ email: loginLower }, { usernameLower: loginLower }],
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email/username or password.",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid email/username or password.",
      });
    }

    return res.json({
      user: publicUser(user),
      token: signToken(user),
    });
  })
);

router.get("/me", auth, (req, res) => {
  res.json(publicUser(req.user));
});

module.exports = router;