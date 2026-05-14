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
  })
);

// Flash
app.use(flash());

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// ✅ CORRECT PASSPORT SETUP
passport.use(new LocalStrategy({ usernameField: "email" }, User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// 6. Routes
app.use("/", require("./routes/userRoutes"));
app.use("/", require("./routes/salesRoutes"));
// app.use("/", require("./routes/depositeRoutes"));
// app.use("/", require("./routes/stockRoutes"));
// app.use("/", require("./routes/supplierRoutes"));

// 7. 404 handler
app.use((req, res) => {
  res.status(404).send("Oops! Route not found.");
});

// 8. Start server
app.listen(port, () =>
  console.log(`Listening on port ${port}`)
);