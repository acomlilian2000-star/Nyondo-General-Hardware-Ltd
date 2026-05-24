const express = require("express");
const router = express.Router();

const Stock = require("../models/Stock");
const Sales = require("../models/Sales");
const Deposit = require("../models/Deposit");

const multer = require("multer");

/* =========================
   MULTER CONFIG
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* =========================
   AUTH CHECK
========================= */
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).send("Please login first");
}

/* =========================
   STOCK FORM
========================= */
router.get("/stockform", async (req, res) => {
  try {
    res.render("stock");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading stock form");
  }
});

/* =========================
   CREATE STOCK (FIXED)
========================= */
router.post(
  "/stock",
  isLoggedIn,
  upload.array("productImage"),
  async (req, res) => {
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
        category,
        specification,
      } = req.body || {};

      const toArray = (v) => (Array.isArray(v) ? v : [v || ""]);

      const items = toArray(itemName);
      const qtys = toArray(quantity);
      const costs = toArray(unitCost);
      const prices = toArray(unitPrice);
      const categories = toArray(category);
      const specs = toArray(specification);

      /* =========================
         GLOBAL SUPPLIER FIX
      ========================= */
      const globalSupplier = supplier || "Unknown";
      const globalContact = contactPerson || "";
      const globalPhone = supplierPhone || "";
      const globalFactory = factoryName || "";

      const methods = toArray(paymentMethod);
      const images = req.files || [];

      const stocks = items.map((_, i) => {
        const qty = Number(qtys[i]) || 0;
        const cost = Number(costs[i]) || 0;
        const price = Number(prices[i]) || 0;

        const method = (methods[i] || methods[0] || "cash")
          .toLowerCase()
          .trim();

        return {
          itemName: items[i] || "",
          category: categories[i] || "General",
          specification: specs[i] || "Pieces",

          quantity: qty,
          unitCost: cost,
          unitPrice: price,

          /* ✅ SAME SUPPLIER FOR ALL ITEMS */
          supplier: globalSupplier,
          contactPerson: globalContact,
          supplierPhone: globalPhone,
          factoryName: globalFactory,

          paymentMethod: method,
          status: method === "credit" ? "Pending" : "Paid",

          /* ✅ CORRECT TOTAL LOGIC */
          total: qty * cost,
          stockCost: qty * cost,

          productImage: images[i] ? images[i].filename : "",
          Attendant: req.user._id,
          createdAt: new Date(),
        };
      });

      await Stock.insertMany(stocks);
      res.redirect("/stockDash");

    } catch (error) {
      console.error("Stock Save Error:", error);
      res.status(500).render("stock", { error: error.message });
    }
  }
);

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

      const remainingQty = Math.max(0, stock.quantity - soldQty);

      return {
        ...stock.toObject(),
        remainingQty
      };
    });

    const totalStockValue = allStocks.reduce((sum, s) => {
      return sum + (Number(s.quantity || 0) * Number(s.unitCost || 0));
    }, 0);

    res.render("stockDash", {
      liveStocks,
      allStocks,
      totalStockValue,
      lowStockCount: liveStocks.filter(i => i.remainingQty <= 5).length,
      totalItemsRecorded: allStocks.length,
      supplierCredits: await Stock.find({ paymentMethod: "credit" })
    });

  } catch (err) {
    console.error(err);
    res.render("stockDash", {
      liveStocks: [],
      allStocks: [],
      totalStockValue: 0,
      lowStockCount: 0,
      totalItemsRecorded: 0,
      supplierCredits: []
    });
  }
});

/* =========================
   SUPPLIER TABLE (RESTORED + FIXED)
========================= */
router.get("/supplierTable", async (req, res) => {
  try {
    const creditStocks = await Stock.find({
      paymentMethod: "credit"
    }).sort({ createdAt: -1 });

    const grouped = {};

    creditStocks.forEach(item => {
      const supplierName = item.supplier || "Unknown Supplier";

      if (!grouped[supplierName]) {
        grouped[supplierName] = {
          supplier: supplierName,
          contactPerson: item.contactPerson || "-",
          supplierPhone: item.supplierPhone || "-",
          factoryName: item.factoryName || "-",
          items: [],
          totalAmount: 0,
          date: item.createdAt
        };
      }

      grouped[supplierName].items.push(item.itemName);

      grouped[supplierName].totalAmount +=
        Number(item.quantity || 0) * Number(item.unitCost || 0);
    });

    const supplierCredits = Object.values(grouped);

    res.render("supplierTable", {
      supplierCredits
    });

  } catch (error) {
    console.error(error);
    res.render("supplierTable", {
      supplierCredits: []
    });
  }
});

/* =========================
   CONFIRM PAYMENT
========================= */
router.get("/supplier/pay/:id", async (req, res) => {
  try {
    await Stock.findByIdAndUpdate(req.params.id, {
      status: "Paid",
      paymentMethod: "cash"
    });

    res.redirect("/supplierTable");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating payment status");
  }
});

/* =========================
   CLEAR DEBT
========================= */
router.get("/supplier/clear/:id", async (req, res) => {
  try {
    await Stock.findByIdAndDelete(req.params.id);
    res.redirect("/supplierTable");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error clearing debt");
  }
});

module.exports = router;