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

  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

/* =========================
   AUTH
========================= */
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

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

        slug:
          stock.slug ||
          stock.itemName.toLowerCase().replace(/\s+/g, "-"),

        currentQuantity: Math.max(
          0,
          (stock.quantity || 0) - soldQty
        )
      };
    });

    const totalStockValue = allStocks.reduce((sum, s) => {
      const qty = Number(s.stockInQuantity || s.quantity || 0);
      const cost = Number(s.unitCost || 0);
      return sum + qty * cost;
    }, 0);

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
   SUPPLIER TABLE (FIXED CORE ISSUE HERE)
========================= */
router.get("/supplierTable", async (req, res) => {

  try {

    const creditStocks = await Stock.find({
      paymentMethod: { $regex: /^credit$/i }
    }).sort({ createdAt: -1 });

    const grouped = {};

    creditStocks.forEach(item => {

      const supplierName = (item.supplier || "Unknown Supplier").trim();

      if (!grouped[supplierName]) {
        grouped[supplierName] = {
          _id: supplierName,
          supplier: supplierName,
          contactPerson: item.contactPerson || "-",
          supplierPhone: item.supplierPhone || "-",
          factoryName: item.factoryName || "-",

          items: [],
          totalQuantity: 0,
          totalAmount: 0,
          totalItems: 0,

          date: item.createdAt,
          status: item.status || "PENDING"
        };
      }

      const qty = Number(item.quantity || 0);
      const cost = Number(item.unitCost || 0);

      /* =========================
         FIX: ALWAYS ACCUMULATE ITEMS PROPERLY
         (THIS WAS YOUR MAIN BUG)
      ========================= */
      const existingItem = grouped[supplierName].items.find(
        i => i.itemName === item.itemName
      );

      if (existingItem) {
        existingItem.quantity += qty;
        existingItem.total += qty * cost;
      } else {
        grouped[supplierName].items.push({
          itemName: item.itemName,
          quantity: qty,
          unitCost: cost,
          total: qty * cost
        });
      }

      grouped[supplierName].totalQuantity += qty;
      grouped[supplierName].totalAmount += qty * cost;
      grouped[supplierName].totalItems = grouped[supplierName].items.length;
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
   MARK SUPPLIER AS PAID
========================= */
router.get("/supplier/mark-paid/:id", async (req, res) => {
  try {

    await Stock.updateMany(
      {
        supplier: req.params.id,
        paymentMethod: { $regex: /^credit$/i }
      },
      {
        $set: {
          status: "PAID",
          paymentMethod: "cash"
        }
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

    const toArr = v => Array.isArray(v) ? v : [v];

    const items = toArr(itemName);
    const qtys = toArr(quantity);
    const costs = toArr(unitCost);
    const prices = toArr(unitPrice);
    const cats = toArr(category);
    const methods = toArr(paymentMethod);

    const images = req.files || [];

    for (let i = 0; i < items.length; i++) {

      const productName = items[i]?.trim();
      if (!productName) continue;

      const qty = Number(qtys[i]) || 0;
      const cost = Number(costs[i]) || 0;
      const price = Number(prices[i]) || 0;

      const method = (methods[i] || "cash").toLowerCase().trim();

      const existingStock = await Stock.findOne({ itemName: productName });

      if (existingStock) {

        existingStock.quantity += qty;
        existingStock.stockInQuantity += qty;
        existingStock.originalQuantity += qty;

        existingStock.supplier = supplier || existingStock.supplier;
        existingStock.contactPerson = contactPerson || existingStock.contactPerson;
        existingStock.supplierPhone = supplierPhone || existingStock.supplierPhone;
        existingStock.factoryName = factoryName || existingStock.factoryName;

        existingStock.unitCost = cost;
        existingStock.unitPrice = price;
        existingStock.category = cats[i] || existingStock.category;

        existingStock.paymentMethod = method;
        existingStock.status = method === "credit" ? "PENDING" : "PAID";

        if (images[i]) {
          existingStock.productImage = images[i].filename;
        }

        await existingStock.save();

      } else {

        await Stock.create({
          itemName: productName,
          slug: productName.toLowerCase().replace(/\s+/g, "-"),
          category: cats[i] || "General",

          quantity: qty,
          stockInQuantity: qty,
          originalQuantity: qty,

          unitCost: cost,
          unitPrice: price,

          supplier: (supplier || "Unknown").trim(),
          contactPerson: contactPerson || "-",
          supplierPhone: supplierPhone || "-",
          factoryName: factoryName || "-",

          paymentMethod: method,
          status: method === "credit" ? "PENDING" : "PAID",

          productImage: images[i] ? images[i].filename : "",
          Attendant: req.user?._id || null,

          createdAt: new Date()
        });
      }
    }

    res.redirect("/stockDash");

  } catch (err) {
    console.error(err);
    res.status(500).send("Stock save error");
  }
});

module.exports = router;