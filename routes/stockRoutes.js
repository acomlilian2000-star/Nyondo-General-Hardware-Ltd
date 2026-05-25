const express = require("express");
const router = express.Router();

const Stock = require("../models/Stock");
const Sales = require("../models/Sales");
const Deposit = require("../models/Deposit");

const multer = require("multer");

/* =========================
   MULTER
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

/* =========================
   AUTH
========================= */
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).send("Login required");
}

/* =========================
   STOCK DASHBOARD
========================= */
router.get("/stockDash", async (req, res) => {
  try {
    const allStocks = await Stock.find()
      .populate("Attendant")
      .sort({ createdAt: -1 });

    const sales = await Sales.find();
    const deposits = await Deposit.find();

    const liveStocks = allStocks.map(stock => {
      let soldQty = 0;

      sales.forEach(sale => {
        sale.items?.forEach(i => {
          if (i.product?.toString() === stock._id.toString()) {
            soldQty += Number(i.quantity || 0);
          }
        });
      });

      deposits.forEach(dep => {
        dep.items?.forEach(i => {
          if (i.product?.toString() === stock._id.toString()) {
            soldQty += Number(i.quantity || 0);
          }
        });
      });

      return {
        ...stock.toObject(),
        slug: stock.slug || stock.itemName.toLowerCase().replace(/\s+/g, "-"),
        currentQuantity: Math.max(
          0,
          (stock.quantity ?? 0) - soldQty
        )
      };
    });

    const totalStockValue = allStocks.reduce((sum, s) => {
      const qty = Number(s.stockInQuantity || s.quantity || 0);
      const cost = Number(s.unitCost || 0);
      return sum + qty * cost;
    }, 0);

    /* 🔥 FIX: CASE INSENSITIVE MATCH */
    const supplierCredits = await Stock.find({
      paymentMethod: { $regex: /^credit$/i }
    });

    res.render("stockDash", {
      liveStocks,
      allStocks,
      totalStockValue,
      lowStockCount: liveStocks.filter(i => i.currentQuantity <= 5).length,
      supplierCredits
    });

  } catch (err) {
    console.error(err);
    res.render("stockDash", {
      liveStocks: [],
      allStocks: [],
      totalStockValue: 0,
      lowStockCount: 0,
      supplierCredits: []
    });
  }
});

/* =========================
   SUPPLIER TABLE (FIXED)
========================= */
router.get("/supplierTable", async (req, res) => {
  try {
    /* 🔥 FIX: CASE INSENSITIVE QUERY */
    const creditStocks = await Stock.find({
      paymentMethod: { $regex: /^credit$/i }
    }).sort({ createdAt: -1 });

    const grouped = {};

    creditStocks.forEach(item => {
      const name = item.supplier || "Unknown Supplier";

      if (!grouped[name]) {
        grouped[name] = {
          _id: name,
          supplier: name,
          contactPerson: item.contactPerson || "-",
          supplierPhone: item.supplierPhone || "-",
          factoryName: item.factoryName || "-",
          items: [],
          totalQuantity: 0,
          totalAmount: 0,
          date: item.createdAt,
          status: "PENDING"
        };
      }

      grouped[name].items.push(item.itemName);
      grouped[name].totalQuantity += Number(item.quantity || 0);
      grouped[name].totalAmount += Number(item.quantity || 0) * Number(item.unitCost || 0);
    });

    res.render("supplierTable", {
      supplierCredits: Object.values(grouped)
    });

  } catch (err) {
    console.error(err);
    res.render("supplierTable", {
      supplierCredits: []
    });
  }
});

/* =========================
   MARK AS PAID (FIXED)
========================= */
router.get("/supplier/mark-paid/:id", async (req, res) => {
  try {
    await Stock.updateMany(
      {
        supplier: req.params.id,
        paymentMethod: { $regex: /^credit$/i }
      },
      {
        status: "PAID",
        paymentMethod: "cash"
      }
    );

    res.redirect("/supplierTable");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating supplier");
  }
});

/* =========================
   STOCK FORM
========================= */
router.get("/stockform", isLoggedIn, (req, res) => {
  res.render("stock");
});

/* =========================
   CREATE STOCK
========================= */
router.post("/stock", isLoggedIn, upload.array("productImage"), async (req, res) => {
  try {
    const {
      itemName,
      quantity,
      supplier,
      contactPerson,
      supplierPhone,
      factoryName,
      unitCost,
      unitPrice,
      paymentMethod,
      category
    } = req.body;

    const toArr = v => (Array.isArray(v) ? v : [v]);

    const items = toArr(itemName);
    const qtys = toArr(quantity);
    const costs = toArr(unitCost);
    const prices = toArr(unitPrice);
    const cats = toArr(category);
    const methods = toArr(paymentMethod);

    const images = req.files || [];

    const stocks = items.map((_, i) => {
      const qty = Number(qtys[i]) || 0;
      const cost = Number(costs[i]) || 0;

      const method = (methods[i] || "cash").toLowerCase();

      return {
        itemName: items[i],
        slug: items[i].toLowerCase().replace(/\s+/g, "-"),
        category: cats[i] || "General",

        quantity: qty,
        stockInQuantity: qty,

        unitCost: cost,
        unitPrice: Number(prices[i]) || 0,

        supplier: (supplier || "Unknown").trim(),
        contactPerson: contactPerson || "-",
        supplierPhone: supplierPhone || "-",
        factoryName: factoryName || "-",

        paymentMethod: method,
        status: method === "credit" ? "PENDING" : "PAID",

        productImage: images[i] ? images[i].filename : "",
        createdAt: new Date()
      };
    });

    await Stock.insertMany(stocks);
    res.redirect("/stockDash");

  } catch (err) {
    console.error(err);
    res.status(500).send("Stock save error");
  }
});

module.exports = router;