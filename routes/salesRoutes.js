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
    let filter = {};

    if (req.query.month) {
      const startDate = new Date(req.query.month + "-01");

      const endDate = new Date(startDate);

      endDate.setMonth(endDate.getMonth() + 1);

      filter.createdAt = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const dbSales = await Sales.find(filter)
      .populate("items.product", "itemName image unitPrice")
      .populate("Attendant", "fullName")
      .sort({ createdAt: -1 });

    /* =========================
       TODAY SALES
    ========================= */
    const start = new Date();

    start.setHours(0, 0, 0, 0);

    const end = new Date();

    end.setHours(23, 59, 59, 999);

    const todaySales = await Sales.find({
      createdAt: {
        $gte: start,
        $lte: end,
      },
    });

    let totalSalesToday = 0;
    let totalSalesAllTime = 0;
    let monthlyTotal = 0;

    todaySales.forEach((sale) => {
      totalSalesToday += Number(sale.grandTotal || 0);
    });

    dbSales.forEach((sale) => {
      totalSalesAllTime += Number(sale.grandTotal || 0);
      monthlyTotal += Number(sale.grandTotal || 0);
    });

    /* =========================
       LOW STOCK
    ========================= */
    const lowStockItems = await Stock.find({
      quantity: { $lte: 5 },
    });

    res.render("salesDash", {
      dbSales,
      totalSalesToday,
      totalSalesAllTime,
      monthlyTotal,
      selectedMonth: req.query.month || "",
      lowStockCount: lowStockItems.length,
      lowStockItems,
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
      lowStockItems: [],
    });
  }
});

/* =========================
   SALES FORM PAGE
========================= */
router.get("/salesform", isLoggedIn, async (req, res) => {
  try {
    const items = await Stock.find({
      quantity: { $gt: 0 },
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
   CREATE SALE
========================= */
router.post("/Sales", isLoggedIn, async (req, res) => {
  try {
    /* =========================
       USER CHECK
    ========================= */
    if (!req.user) {
      return res.status(401).send("User not logged in");
    }

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

    /* =========================
       FORCE ARRAYS
    ========================= */
    product = Array.isArray(product) ? product : [product];

    specification = Array.isArray(specification)
      ? specification
      : [specification];

    quantity = Array.isArray(quantity) ? quantity : [quantity];

    unitPrice = Array.isArray(unitPrice) ? unitPrice : [unitPrice];

    /* =========================
       VALIDATION
    ========================= */
    if (!customerName || !product.length) {
      return res.status(400).send("Missing required fields");
    }

    let items = [];

    let total = 0;

    /* =========================
       LOOP THROUGH PRODUCTS
    ========================= */
    for (let i = 0; i < product.length; i++) {
      const qty = Number(quantity[i] || 0);

      const price = Number(unitPrice[i] || 0);

      if (!product[i] || qty <= 0 || price <= 0) {
        continue;
      }

      const stockItem = await Stock.findById(product[i]);

      if (!stockItem) {
        return res.status(404).send("Product not found");
      }

      if (stockItem.quantity < qty) {
        return res
          .status(400)
          .send(`Not enough stock for ${stockItem.itemName}`);
      }

      /* =========================
         UPDATE STOCK
      ========================= */
      stockItem.quantity -= qty;

      await stockItem.save();

      const subTotal = qty * price;

      total += subTotal;

      items.push({
  product: stockItem._id,

  itemName: stockItem.itemName, // 🔥 THIS FIXES YOUR ERROR

  specification: specification[i] || "-",
  quantity: qty,
  unitPrice: price,
  subTotal,
});
    }

    /* =========================
       GRAND TOTAL
    ========================= */
    const transport = Number(transportCost || 0);

    const grandTotal = total + transport;

    /* =========================
       SAVE SALE
    ========================= */
    const newSale = new Sales({
      date: date || new Date(),

      customerName,

      phoneNumber: phoneNumber || "-",

      customerAddress: customerAddress || "-",

      customerType: customerType || "individual",

      items,

      subTotal: total,

      grandTotal,

      transportCost: transport,

      distance: Number(distance || 0),

      paymentMethod: paymentMethod || "-",

      Attendant: req.user ? req.user._id : null,
    });

    await newSale.save();

    return res.redirect(`/sales/receipt/${newSale._id}`);
  } catch (error) {
    console.error("Sales Error:", error);

    return res.status(500).send("Error saving Sales: " + error.message);
  }
});

/* =========================
   EDIT PAGE
========================= */
router.get("/sales/edit/:id", isLoggedIn, async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id).populate("items.product");

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
      distance,
      transportCost,
      paymentMethod,
    } = req.body;

    await Sales.findByIdAndUpdate(req.params.id, {
      customerName,
      phoneNumber,
      customerAddress,
      customerType,
      distance: Number(distance || 0),
      transportCost: Number(transportCost || 0),
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
    await Sales.findByIdAndDelete(req.params.id);

    res.redirect("/salesDash");
  } catch (error) {
    console.error(error);

    res.status(500).send("Error deleting sale");
  }
});

/* =========================
   MARK UPDATED
========================= */
router.get("/sales/mark-updated/:id", isLoggedIn, async (req, res) => {
  try {
    await Sales.findByIdAndUpdate(req.params.id, {
      updatedAt: new Date(),
      status: "updated",
    });

    res.redirect("/salesDash");
  } catch (err) {
    console.error(err);

    res.status(500).send("Error marking update");
  }
});

/* =========================
   RECEIPT
========================= */
router.get("/sales/receipt/:id", isLoggedIn, async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id)
      .populate("items.product", "itemName image unitPrice")
      .populate("Attendant", "fullName");

    if (!sale) {
      return res.status(404).send("Sale not found");
    }

    res.render("receipt", {
      sale,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send("Error loading receipt");
  }
});

module.exports = router;
