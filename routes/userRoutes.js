// setup and Dependency
// Framework & Routing
const express = require("express");
const router = express.Router();
// Authentication
const passport = require("passport");
// Database Models
const User = require("../models/User");
const Stock = require("../models/Stock");
const Sales = require("../models/Sales");
const Deposit = require("../models/Deposit");

// auth
//
function isLoggedIn(req, res, next) {
  // verification logic
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).send("Login required");
}

// loginpage
router.get("/login", (req, res) => {
  res.render("login", {
    error_msg: req.flash("error_msg"),
    success_msg: req.flash("success_msg"),
    error: req.flash("error"),
  });
});

// homepage
router.get("/", (req, res) => {
  res.render("index");
});

// login page
router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
    failureFlash: "Invalid email or password.",
  }),
  (req, res) => {
    if (req.user.role === "admin") {
      res.redirect("/adminDash");
    } else if (req.user.role === "sales_attendant") {
      res.redirect("/salesDash");
    } else if (req.user.role === "stock_manager") {
      res.redirect("/stockDash");
    } else {
      res.redirect("/login");
    }
  },
);

// logoutpage
router.get("/logout", (req, res, next) => {
  console.log("Logout request received...");
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return next(err);
    }
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      console.log("Session destroyed. Redirecting to login.");
      res.redirect("/");
    });
  });
});

// signuppage
router.get("/SignUpform", (req, res) => {
  res.render("SignUp", {
    error_msg: req.flash("error_msg"),
    success_msg: req.flash("success_msg"),
    error: req.flash("error"),
  });
});

// creating a user
router.post("/SignUp", async (req, res) => {
  // data extraction,it pulls all the data submitted from the pug file into one single object
  try {
    const {
      fullName,
      email,
      ninNumber,
      role,
      ugPhoneNumber,
      userName,
      address,
      password,
    } = req.body;
    // validation
    if (!fullName || fullName.trim() === "") {
      req.flash("error_msg", "Validation Error: Full Name is required.");
      return res.redirect("/SignUpform");
    }

    if (!email || email.trim() === "") {
      req.flash(
        "error_msg",
        "Validation Error: Valid Email address is required.",
      );
      return res.redirect("/SignUpform");
    }

    if (!ninNumber || ninNumber.trim() === "") {
      req.flash(
        "error_msg",
        "Validation Error: National Identification Number (NIN) is required.",
      );
      return res.redirect("/SignUpform");
    }

    if (!role || role === "") {
      req.flash(
        "error_msg",
        "Validation Error: System access workspace role selection is required.",
      );
      return res.redirect("/SignUpform");
    }

    if (!ugPhoneNumber || ugPhoneNumber.trim() === "") {
      req.flash(
        "error_msg",
        "Validation Error: Contact phone information profile is required.",
      );
      return res.redirect("/SignUpform");
    }

    if (!userName || userName.trim() === "") {
      req.flash(
        "error_msg",
        "Validation Error: Account unique username is required.",
      );
      return res.redirect("/SignUpform");
    }

    if (!address || address.trim() === "") {
      req.flash(
        "error_msg",
        "Validation Error: Physical localized home address is required.",
      );
      return res.redirect("/SignUpform");
    }

    if (!password || password.trim() === "") {
      req.flash(
        "error_msg",
        "Validation Error: Secure user account clearance password is required.",
      );
      return res.redirect("/SignUpform");
    }
    // duplication check
    let existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      req.flash(
        "error_msg",
        "Conflict Error: That email address profile is already registered.",
      );
      return res.redirect("/SignUpform");
    }

    let existingUsername = await User.findOne({ userName: userName.trim() });
    if (existingUsername) {
      req.flash(
        "error_msg",
        "Conflict Error: That username handle is already taken.",
      );
      return res.redirect("/SignUpform");
    }
    // creating user object
    const newUser = new User({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      ninNumber: ninNumber.toUpperCase().trim(),
      address: address.trim(),
      ugPhoneNumber: ugPhoneNumber.trim(),
      role,
      userName: userName.trim(),
      dateJoined: new Date(),
    });
    // secure registration passport strategy
    await User.register(newUser, password, (err) => {
      if (err) {
        console.error("Passport register fault trace execution stack:", err);
        req.flash("error_msg", "Strategy Registration Error: " + err.message);
        return res.redirect("/SignUpform");
      }

      req.flash(
        "success_msg",
        "New internal operations user profile created successfully!",
      );
      return res.redirect("/login");
    });
  } catch (error) {
    console.error(error);
    req.flash(
      "error_msg",
      "System Exception: Registry pipeline processing aborted: " +
        error.message,
    );
    return res.redirect("/SignUpform");
  }
});

// table of users
router.get("/users", isLoggedIn, async (req, res) => {
  try {
    // This searches your MongoDB User collection for every record it contains.
    const users = await User.find().sort({ dateJoined: -1 });
    res.render("users", {
      users,
      error_msg: req.flash("error_msg"),
      success_msg: req.flash("success_msg"),
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Failed to fetch users");
  }
});
// reports page
router.get("/reports", isLoggedIn, async (req, res) => {
  try {
    // fetching data
    const sales = await Sales.find().populate("items.product");
    const deposits = await Deposit.find();
    const stocks = await Stock.find();

    // Month labels
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    //  Monthly Sales
    const monthlySales = new Array(12).fill(0);
    sales.forEach((sale) => {
      const month = new Date(sale.date || sale.createdAt).getMonth();
      monthlySales[month] += Number(sale.grandTotal || 0);
    });

    //  Monthly Deposit
    // this organise deposit data into  12 month calender
    const monthlyDeposits = new Array(12).fill(0);
    deposits.forEach((dep) => {
      const month = new Date(dep.regDate || dep.createdAt).getMonth();
      monthlyDeposits[month] += Number(dep.totalToPay || 0);
    });

    //  Total metrics
    // modern JavaScript way to summarize lists
    const totalSales = monthlySales.reduce((a, b) => a + b, 0);
    const totalDeposits = monthlyDeposits.reduce((a, b) => a + b, 0);

    // stock
    // Its purpose is to calculate the total capital you have tied up in your current stock by multiplying the quantity of every item by its cost
    const totalStockValue = stocks.reduce((sum, s) => {
      const qty = Number(s.stockInQuantity || s.quantity || 0);
      const cost = Number(s.unitCost || 0);
      return sum + qty * cost;
    }, 0);

    //  Product movement
    // Product Sales Velocity Counter.
    const productMap = {};
    sales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const productName = item.product?.itemName || "Unknown Product";
          if (!productMap[productName]) productMap[productName] = 0;
          productMap[productName] += Number(item.quantity || 0);
        });
      } else {
        const productName = sale.product?.itemName || "Unknown Product";
        if (!productMap[productName]) productMap[productName] = 0;
        productMap[productName] += Number(sale.quantity || 0);
      }
    });

    // Sort products
    const sortedProducts = Object.entries(productMap).sort(
      (a, b) => b[1] - a[1],
    );

    // Moving Cards
    const fastMovingItem = sortedProducts[0]?.[0] || "No Data";
    const lowMovingItem =
      sortedProducts[sortedProducts.length - 1]?.[0] || "No Data";

    // Chart Balances
    const fastMovingLabels = sortedProducts.slice(0, 5).map((p) => p[0]);
    const fastMovingData = sortedProducts.slice(0, 5).map((p) => p[1]);
    const lowMovingLabels = sortedProducts.slice(-5).map((p) => p[0]);
    const lowMovingData = sortedProducts.slice(-5).map((p) => p[1]);

    // Yearly Sales
    const yearlyMap = {};
    sales.forEach((sale) => {
      const year = new Date(sale.date || sale.createdAt).getFullYear();
      if (!yearlyMap[year]) yearlyMap[year] = 0;
      yearlyMap[year] += Number(sale.grandTotal || 0);
    });

    const yearLabels = Object.keys(yearlyMap);
    const yearlySales = Object.values(yearlyMap);

    // Render
    res.render("reports", {
      totalSales,
      totalDeposits,
      totalStockValue,
      months,
      monthlySales,
      monthlyDeposits,
      yearLabels,
      yearlySales,
      fastMovingItem,
      lowMovingItem,
      fastMovingLabels,
      fastMovingData,
      lowMovingLabels,
      lowMovingData,
      error_msg: req.flash("error_msg"),
      success_msg: req.flash("success_msg"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading reports");
  }
});

module.exports = router;
