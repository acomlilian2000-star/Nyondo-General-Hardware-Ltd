const express = require("express");
const router = express.Router();
const User = require("../models/User");
const passport = require("passport");

// 🏠 Homepage
router.get('/', (req, res) => {
  res.render('index');
});

router.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/login" }),
  (req, res) => {
    if (req.user.role === "admin") {
      res.redirect("/adminDash");
    } else if (req.user.role === "sales_attendant") {
      res.redirect("/salesDash");
    } else if (req.user.role === "stock_manager") {
      res.redirect("/StockDash");
    } else {
      res.redirect("/login");
    }
  },
);



// 🚪 Login GET
router.get("/login", (req, res) => {
  res.render("login");
});


// 📝 Signup GET
router.get('/SignUpform', (req, res) => {
  res.render('SignUp');
});


// 📝 Signup POST (FIXED PROMISE STYLE)
router.post("/SignUp", async (req, res) => {

  try {

    const {
      fullName,
      email,
      ninNumber,
      role,
      phoneNumber,
      password,
      address
    } = req.body;

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.render("SignUp", {
        error: "Email already exists"
      });
    }

    const newUser = new User({
      fullName,
      email: email.toLowerCase(),
      ninNumber: ninNumber.toUpperCase(),
      role,
      phoneNumber,
      address,
      isFirstLogin: true
    });

    await User.register(newUser, password);

    console.log("USER REGISTERED SUCCESSFULLY");

    return res.redirect("/login");

  } catch (error) {
    console.log(error);
    return res.status(500).send("Registration Failed");
  }

});


// 🚪 Logout
router.get('/logout', (req, res, next) => {

  req.logout((err) => {

    if (err) return next(err);

    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });

  });

});

module.exports = router;