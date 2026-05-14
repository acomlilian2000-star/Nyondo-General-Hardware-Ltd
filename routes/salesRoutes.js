
const express = require("express");
const router = express.Router();
const Sales = require("../models/Sales");
const Stock = require("../models/Stock");

/* =========================
   AUTH MIDDLEWARE
========================= */
function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect("/login");
  }
  next();
}

/* =========================
   SALES DASHBOARD
========================= */
router.get("/salesDash", isLoggedIn, async (req, res) => {
  try {
    const dbSales = await Sales.find()
      .populate("product", "itemName")
      .populate("Attendant", "fullName")
      .sort({ createdAt: -1 });

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const todaySales = await Sales.find({
      createdAt: { $gte: start, $lte: end },
    });

    let totalSalesToday = 0;

    todaySales.forEach((sale) => {
      totalSalesToday += Number(sale.total || 0);
    });

    res.render("salesDash", {
      dbSales,
      totalSalesToday,
    });
  } catch (err) {
    console.error(err);
    res.render("salesDash", {
      dbSales: [],
      totalSalesToday: 0,
    });
  }
});

/* =========================
   SALES FORM PAGE
========================= */
router.get("/salesform", isLoggedIn, async (req, res) => {
  try {
    const items = await Stock.find({ quantity: { $gt: 0 } });
    res.render("Sales", { products: items });
  } catch (error) {
    console.error("Error fetching stock:", error);
    res.status(500).send("Internal Server Error");
  }
});

/* =========================
   CREATE SALE + UPDATE STOCK
========================= */
router.post("/Sales", isLoggedIn, async (req, res) => {
  try {
    console.log("🔥 POST /Sales HIT");
    console.log("BODY:", req.body);
    console.log("USER:", req.user);
    const { product, quantity, unitPrice, total, paymentMethod, customerName } = req.body;

    // 🔴 VALIDATIONS
    if (!product || !quantity || !unitPrice || !paymentMethod || !customerName) {
      return res.status(400).send("All required fields must be filled");
    }

    // Find stock item
    const stockItem = await Stock.findById(product);

    if (!stockItem) {
      return res.status(404).send("Product not found in database");
    }

    const quantityToSell = Number(quantity);

    if (stockItem.quantity < quantityToSell) {
      return res
        .status(400)
        .send(`Not enough stock. Available: ${stockItem.quantity}`);
    }

    // ✅ Reduce stock safely
    stockItem.quantity -= quantityToSell;
    await stockItem.save();

    // ✅ Create sale
    const newSale = new Sales({
      customerName,
      product,
      customerType: req.body.customerType,
      quantity: quantityToSell,
      unitPrice: Number(unitPrice),
      paymentMethod,
      color: req.body.color,
      guage: req.body.guage,
      total: Number(total),

      // 🔐 SAFE: user is guaranteed by middleware
      Attendant: req.user._id,
    });

    await newSale.save();

    return res.redirect("/salesform");

  } catch (error) {
    console.error("Database Error:", error.message);
    return res.status(500).send("Error saving Sales: " + error.message);
  }
});

module.exports = router;