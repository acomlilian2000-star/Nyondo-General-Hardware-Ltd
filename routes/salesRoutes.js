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

    /* =========================
       MONTHLY FILTER
    ========================= */
    let filter = {};

    if (req.query.month) {

      const selectedMonth = req.query.month;

      const startDate = new Date(selectedMonth + "-01");

      const endDate = new Date(startDate);

      endDate.setMonth(endDate.getMonth() + 1);

      filter.createdAt = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const dbSales = await Sales.find(filter)
      .populate("product", "itemName image")
      .populate("Attendant", "fullName")
      .sort({ createdAt: -1 });

    /* =========================
       TODAY SALES CALCULATION
    ========================= */
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const todaySales = await Sales.find({
      createdAt: { $gte: start, $lte: end },
    });

    let totalSalesToday = 0;
    let totalSalesAllTime = 0;
    let monthlyTotal = 0;

    todaySales.forEach((sale) => {
      totalSalesToday += Number(sale.grandTotal || 0);
    });

    dbSales.forEach((sale) => {
      totalSalesAllTime += Number(sale.grandTotal || 0);
    });

    /* =========================
       MONTHLY TOTAL
    ========================= */
    dbSales.forEach((sale) => {
      monthlyTotal += Number(sale.grandTotal || 0);
    });

    /* =========================
       LOW STOCK ALERT FIX
    ========================= */
    const lowStockItems = await Stock.find({
      quantity: { $lte: 5 }
    });

    const lowStockCount = lowStockItems.length;

    res.render("salesDash", {
      dbSales,
      totalSalesToday,
      totalSalesAllTime,
      monthlyTotal,
      selectedMonth: req.query.month || "",
      lowStockCount,
      lowStockItems
    });

  } catch (err) {
    console.error(err);

    res.render("salesDash", {
      dbSales: [],
      totalSalesToday: 0,
      totalSalesAllTime: 0,
      monthlyTotal: 0,
      selectedMonth: "",
      lowStockCount: 0,
      lowStockItems: []
    });
  }
});

/* =========================
   SALES FORM PAGE
========================= */
router.get("/salesform", isLoggedIn, async (req, res) => {
  try {
    const items = await Stock.find({
      quantity: { $gt: 0 }
    });

    res.render("sales", {
      products: items,
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

/* =========================
   CREATE SALE + UPDATE STOCK
========================= */
router.post("/Sales", isLoggedIn, async (req, res) => {
  try {

    let {
      date,
      product,
      specification,
      quantity,
      unitPrice,
      customerName,
      phoneNumber,
      customerAddress,
      customerType,
      distance,
      transportCost,
      paymentMethod,
    } = req.body;

    const qty = Number(quantity || 0);
    const price = Number(unitPrice || 0);
    const transport = Number(transportCost || 0);
    const dist = Number(distance || 0);

    /* =========================
       VALIDATION
    ========================= */
    if (!product || qty <= 0 || price <= 0 || !customerName) {
      return res.status(400).send("Missing required fields");
    }

    /* =========================
       CHECK STOCK
    ========================= */
    const stockItem = await Stock.findById(product);

    if (!stockItem) {
      return res.status(404).send("Product not found");
    }

    if (stockItem.quantity < qty) {
      return res.status(400).send(
        `Not enough stock. Available: ${stockItem.quantity}`
      );
    }

    /* =========================
       UPDATE STOCK
    ========================= */
    stockItem.quantity -= qty;
    await stockItem.save();

    /* =========================
       CALCULATIONS
    ========================= */
    const subTotal = qty * price;
    const grandTotal = subTotal + transport;

    /* =========================
       CREATE SALE
    ========================= */
    const newSale = new Sales({
      date: date || new Date(),

      customerName: customerName || "-",
      phoneNumber: phoneNumber || "-",
      customerAddress: customerAddress || "-",
      customerType: customerType || "individual",

      product,

      specification: Array.isArray(specification)
        ? specification[0]
        : specification || "-",

      quantity: qty,
      unitPrice: price,

      distance: dist,
      transportCost: transport,

      subTotal,
      grandTotal,

      paymentMethod: paymentMethod || "-",

      Attendant: req.user._id,
    });

    await newSale.save();

    /* =========================
       REDIRECT TO RECEIPT
    ========================= */
    return res.redirect(`/sales/receipt/${newSale._id}`);

  } catch (error) {
    console.error("Sales Error:", error);

    return res.status(500).send(
      "Error saving Sales: " + error.message
    );
  }
});

/* =========================
   EDIT SALE PAGE
========================= */
router.get("/sales/edit/:id", isLoggedIn, async (req, res) => {
  try {

    const sale = await Sales.findById(req.params.id)
      .populate("product");

    const products = await Stock.find();

    if (!sale) {
      return res.status(404).send("Sale not found");
    }

    res.render("editSale", {
      sale,
      products,
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading sale");
  }
});

/* =========================
   UPDATE SALE
========================= */
router.post("/sales/edit/:id", isLoggedIn, async (req, res) => {
  try {

    let {
      customerName,
      phoneNumber,
      customerAddress,
      customerType,
      specification,
      quantity,
      unitPrice,
      distance,
      transportCost,
      paymentMethod,
    } = req.body;

    const qty = Number(quantity || 0);
    const price = Number(unitPrice || 0);
    const transport = Number(transportCost || 0);
    const dist = Number(distance || 0);

    const subTotal = qty * price;
    const grandTotal = subTotal + transport;

    await Sales.findByIdAndUpdate(req.params.id, {

      customerName,
      phoneNumber,
      customerAddress,
      customerType,

      specification: Array.isArray(specification)
        ? specification[0]
        : specification || "-",

      quantity: qty,
      unitPrice: price,

      distance: dist,
      transportCost: transport,

      subTotal,
      grandTotal,

      paymentMethod,
    });

    res.redirect("/salesDash");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating sale");
  }
});

/* =========================
   DELETE SALE
========================= */
router.get("/sales/delete/:id", isLoggedIn, async (req, res) => {
  try {

    const sale = await Sales.findById(req.params.id);

    if (!sale) {
      return res.status(404).send("Sale not found");
    }

    await Sales.findByIdAndDelete(req.params.id);

    res.redirect("/salesDash");

  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).send("Error deleting sale");
  }
});

/* =========================
   CONFIRM UPDATE
========================= */
router.get("/sales/mark-updated/:id", isLoggedIn, async (req, res) => {
  try {

    await Sales.findByIdAndUpdate(req.params.id, {
      updatedAt: new Date(),
      status: "updated"
    });

    res.redirect("/salesDash");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error marking update");
  }
});

/* =========================
   VIEW RECEIPT
========================= */
router.get("/sales/receipt/:id", isLoggedIn, async (req, res) => {
  try {

    const sale = await Sales.findById(req.params.id)
      .populate("product", "itemName image unitPrice")
      .populate("Attendant", "fullName");

    if (!sale) {
      return res.status(404).send("Sale not found");
    }

    res.render("receipt", {
      sale
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading receipt");
  }
});

module.exports = router;