// 1. Dependencies
const express = require("express");
const expressSession = require("express-session");
const path = require("path");
const mongoose = require("mongoose");
const passport = require("passport");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local").Strategy;
require("dotenv").config();

const connectDB = require("./config/db");
const User = require("./models/User");

// 2. App setup
const app = express();
const port = process.env.PORT || 3000;

// 3. Database connection
connectDB();

// 4. View engine (PUG)
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// 5. Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(
  expressSession({
    secret: process.env.SESSION_SECRET || "NyondoStockSecret",
    resave: false,
    saveUninitialized: false,
  }),
);

// Flash
app.use(flash());

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// PASSPORT SETUP
passport.use(
  new LocalStrategy({ usernameField: "email" }, User.authenticate()),
);
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//  GLOBAL MIDDLEWARE
app.use(async (req, res, next) => {
  if (req.isAuthenticated()) {
    try {
      const fullUser = await User.findById(req.user._id);
      res.locals.currentUser = fullUser;
    } catch (err) {
      console.error("Error hydrating user:", err);
      res.locals.currentUser = req.user;
    }
  } else {
    res.locals.currentUser = null;
  }

  // Flash messages
  res.locals.error_msg = req.flash("error_msg");
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error = req.flash("error");

  const flashData = req.flash("formData");
  res.locals.formData = flashData.length > 0 ? flashData[0] : {};

  next();
});

// 6. Routes
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use("/", require("./routes/userRoutes"));
app.use("/", require("./routes/salesRoutes"));
app.use("/", require("./routes/depositRoutes"));
app.use("/", require("./routes/stockRoutes"));

// 7. 404 handler
app.use((req, res) => {
  res.status(404).send("Oops! Route not found.");
});

// 8. Start server
app.listen(port, () => console.log(`Listening on port ${port}`));
