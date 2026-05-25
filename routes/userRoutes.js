const express = require("express");
const router = express.Router();
// const Registration = require("../models/User");
const passport = require("passport");
const User = require("../models/User");
const Stock = require("../models/Stock");
const Sales = require("../models/Sales");
const Deposit = require("../models/Deposit");
// loginpage
router.get("/login", (req, res) => {
  res.render("login");
});
// homepage
router.get("/", (req, res) => {
  res.render("index");
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
      res.redirect("/stockDash");
    } else {
      res.redirect("/login");
    }
  },
);

// logoutpage

router.get('/logout', (req, res, next) =>{
  console.log("Logout request received...");
  req.logout( (err)=>{
    console.error("Logout error:", err);
    if(err) {

      return next(err);
    }
    req.session.destroy(() => {
        res.clearCookie('connect.sid'); // Clears the session cookie
        console.log("Session destroyed. Redirecting to login.");
        res.redirect('/'); 
    });
  
  })
})




// signuppage

router.get("/SignUpform", (req, res) => {
  res.render("SignUp");
});
router.post("/SignUp", async (req, res) => {
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
    //   if user already exists
    let existingUser = await User.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      return res.render("SignUp", { error: "Email is already registered" });
    }
    // const create new user
    const newUser = new User({
      fullName,
      email: email.toLowerCase(),
      ninNumber: ninNumber.toUpperCase(),
      address,
      ugPhoneNumber,
      role,
      userName,
      password,
      dateJoined: new Date() ,
    });
    console.log(newUser);
    console.log("Password:", req.body.password);
    await Registration.register(newUser, req.body.password, (err) => {
      if (err) {
        return res.redirect("/SignUp");
      }
    });
    res.redirect("/login");

    //  res.redirect('/login')
  } catch (error) {
    console.error(error);
  }
});
// table of users
router.get("/users", async (req, res) => {

  try {

    // fetch all users from database
    const users = await User.find().sort({ dateJoined: -1 });

    // render users page
    res.render("users", {
      users
    });

  } catch (error) {

    console.log(error);

    res.status(500).send("Failed to fetch users");

  }

});


// reports
/* =========================
   REPORTS PAGE
========================= */
router.get("/reports", async (req, res) => {

  try {

    // ================= SALES =================
    const sales = await Sales.find()
      .populate("items.product");

    // ================= DEPOSITS =================
    const deposits = await Deposit.find();

    // ================= STOCK =================
    const stocks = await Stock.find();

    // ================= MONTH LABELS =================
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
      "Dec"
    ];

    // ================= MONTHLY SALES =================
    const monthlySales =
      new Array(12).fill(0);

    sales.forEach(sale => {

      const month =
        new Date(
          sale.date || sale.createdAt
        ).getMonth();

      monthlySales[month] +=
        Number(sale.grandTotal || 0);
    });

    // ================= MONTHLY DEPOSITS =================
    const monthlyDeposits =
      new Array(12).fill(0);

    deposits.forEach(dep => {

      const month =
        new Date(
          dep.regDate || dep.createdAt
        ).getMonth();

      monthlyDeposits[month] +=
        Number(dep.totalToPay || 0);
    });

    // ================= TOTAL SALES =================
    const totalSales =
      monthlySales.reduce(
        (a, b) => a + b,
        0
      );

    // ================= TOTAL DEPOSITS =================
    const totalDeposits =
      monthlyDeposits.reduce(
        (a, b) => a + b,
        0
      );

    // ================= TOTAL STOCK VALUE =================
    const totalStockValue =
      stocks.reduce((sum, item) => {

        const qty =
          Number(item.quantity || 0);

        const cost =
          Number(item.unitCost || 0);

        return sum + (qty * cost);

      }, 0);

    // ================= PRODUCT MOVEMENT =================
    const productMap = {};

    sales.forEach(sale => {

      if (sale.items && sale.items.length > 0) {

        sale.items.forEach(item => {

          const productName =
            item.product?.itemName ||
            "Unknown Product";

          if (!productMap[productName]) {
            productMap[productName] = 0;
          }

          productMap[productName] +=
            Number(item.quantity || 0);
        });

      } else {

        const productName =
          sale.product?.itemName ||
          "Unknown Product";

        if (!productMap[productName]) {
          productMap[productName] = 0;
        }

        productMap[productName] +=
          Number(sale.quantity || 0);
      }
    });

    // ================= SORT PRODUCTS =================
    const sortedProducts =
      Object.entries(productMap)
        .sort((a, b) => b[1] - a[1]);

    // ================= FAST MOVING ITEM =================
    const fastMovingItem =
      sortedProducts[0]?.[0] ||
      "No Data";

    // ================= LOW MOVING ITEM =================
    const lowMovingItem =
      sortedProducts[
        sortedProducts.length - 1
      ]?.[0] || "No Data";

    // ================= FAST MOVING CHART =================
    const fastMovingLabels =
      sortedProducts
        .slice(0, 5)
        .map(p => p[0]);

    const fastMovingData =
      sortedProducts
        .slice(0, 5)
        .map(p => p[1]);

    // ================= LOW MOVING CHART =================
    const lowMovingLabels =
      sortedProducts
        .slice(-5)
        .map(p => p[0]);

    const lowMovingData =
      sortedProducts
        .slice(-5)
        .map(p => p[1]);

    // ================= YEARLY SALES =================
    const yearlyMap = {};

    sales.forEach(sale => {

      const year =
        new Date(
          sale.date || sale.createdAt
        ).getFullYear();

      if (!yearlyMap[year]) {
        yearlyMap[year] = 0;
      }

      yearlyMap[year] +=
        Number(sale.grandTotal || 0);
    });

    const yearLabels =
      Object.keys(yearlyMap);

    const yearlySales =
      Object.values(yearlyMap);

    // ================= RENDER =================
    res.render("reports", {

      // totals
      totalSales,
      totalDeposits,
      totalStockValue,

      // monthly
      months,
      monthlySales,
      monthlyDeposits,

      // yearly
      yearLabels,
      yearlySales,

      // movement cards
      fastMovingItem,
      lowMovingItem,

      // charts
      fastMovingLabels,
      fastMovingData,

      lowMovingLabels,
      lowMovingData
    });

  } catch (err) {

    console.error(err);

    res.status(500).send(
      "Error loading reports"
    );
  }
});


module.exports = router;