const express = require("express");
const router = express.Router();
const User = require("../models/User");
const passport = require("passport");

// 🔐 Middleware (FIXED)
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

// login page
router.get("/login", (req, res) => {
  res.render("login");
});

// homepage
router.get("/", (req, res) => {
  res.render("index");
});

// secure account
router.get('/secureAcc', isLoggedIn, (req, res) => {
  res.render('secureAcc');
});

// login
router.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/login" }),
  (req, res) => {
    if (req.user.isFirstLogin) {
      return res.redirect("/secureAcc");
    }
    if (req.user.role === "admin") {
      res.redirect("/Dashboard");
    } 
    else if (req.user.role === "sales_attendant") {
      res.redirect("/salesDash");
    } 
    else if (req.user.role === "stock_manager") {
      res.redirect("/StockDash");
    } 
    else {
      res.redirect("/login");
    }
  }
);

// logout
router.get('/logout', (req, res, next) => {
  console.log("Logout request received...");
  
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return next(err);
    }

    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      console.log("Session destroyed. Redirecting to login.");
      res.redirect('/home');
    });
  });
});

// signup page
router.get("/SignUpform", (req, res) => {
  res.render("SignUp");
});

// signup
router.post("/SignUp", async (req, res) => {
  try {
    const {
      fullName,
      email,
      ninNumber,
      role,
      phoneNumber,
      password,
      address,

    } = req.body;

    // check existing user
    let existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.render("SignUp", { error: "Email is already registered" });
    }

    // create new user
    const newUser = new User({
      fullName,
      email,
      password,
      ninNumber: ninNumber.toUpperCase(),
      address,
      phoneNumber: phoneNumber,
      role,
      

    });

    console.log(newUser);
    console.log("Password:", req.body.password);

    User.register(newUser, req.body.password, (err) => {
      if (err) {
        console.log(err);
        return res.redirect("/SignUpform");
      }
      res.redirect("/login");
    });

  } catch (error) {
    console.error(error);
  }
});

module.exports = router;