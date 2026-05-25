const express = require("express");
const router = express.Router();
const User = require("../models/User");
const passport = require("passport");


// ================= DEBUG MIDDLEWARE =================
router.use((req, res, next) => {
  console.log("📡 REQUEST:", req.method, req.url);
  next();
});


// 🏠 Homepage
router.get("/", (req, res) => {
  res.render("index");
});


// 🚪 Login GET (kept only UI render, NO POST)
router.get("/login", (req, res) => {
  res.render("login");
});


router.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/login" }),
  (req, res) => {
    if (req.user.role === "admin") {
      res.redirect("/adminDash");
    } else if (req.user.role === "sales-attendant") {
      res.redirect("/salesDash");
    } else if (req.user.role === "stock-manager") {
      res.redirect("/StockDash");
    } else {
      res.redirect("/login");
    }
  },
);


// 📝 Signup GET
router.get("/SignUpform", (req, res) => {
  res.render("SignUp");
});


// 📝 SIGNUP POST (ONLY WORKING LOGIC)
router.post("/SignUp", async (req, res) => {

  try {

    console.log("🔥 SIGNUP ROUTE HIT");
    console.log("BODY:", req.body);

    const {
      fullName,
      email,
      ninNumber,
      role,
      phoneNumber,
      password,
      address
    } = req.body;

    // ================= VALIDATION =================
    if (!fullName || !email || !ninNumber || !role || !phoneNumber || !password || !address) {
      return res.render("SignUp", { error: "All fields are required" });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.render("SignUp", { error: "Invalid email address" });
    }

    const strongPassword = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!strongPassword.test(password)) {
      return res.render("SignUp", {
        error: "Password must be 8+ chars with letters & numbers"
      });
    }

    if (phoneNumber.length < 9) {
      return res.render("SignUp", { error: "Invalid phone number" });
    }

    if (ninNumber.length < 14) {
      return res.render("SignUp", { error: "Invalid NIN Number" });
    }

    const normalizedEmail = email.toLowerCase();

    // ================= CHECK EXISTING USER =================
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.render("SignUp", { error: "Email already exists" });
    }

    // ================= CREATE USER =================
    const newUser = new User({
      fullName,
      email: normalizedEmail,
      ninNumber: ninNumber.toUpperCase(),
      role,
      phoneNumber,
      address,
      isFirstLogin: true
    });

    console.log("👉 BEFORE REGISTER");

    // ================= SAVE USER =================
    const savedUser = await User.register(newUser, password);

    console.log("✅ USER SAVED IN DATABASE:", savedUser._id);

    return res.redirect("/login");

  } catch (error) {
    console.log("❌ SIGNUP ERROR:", error);
    return res.status(500).send(error.message);
  }

});


// 🚪 Logout
router.get("/logout", (req, res, next) => {

  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });

});


module.exports = router;