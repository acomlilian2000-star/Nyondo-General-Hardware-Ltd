const express = require("express");
const router = express.Router();
const Stock = require("../models/Stock");
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
   AUTH CHECK MIDDLEWARE
========================= */
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).send("Please login first");
}

/* =========================
   GET STOCK FORM PAGE
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
   POST STOCK DATA
========================= */
router.post(
  "/stock",
  isLoggedIn,
  upload.array("productImage"),
  async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).send("No form data received");
      }

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
        amountPaid,
        specification,
      } = req.body || {};

      const toArray = (value) => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
      };

      const items = toArray(itemName);
      const qtys = toArray(quantity);
      const costs = toArray(unitCost);
      const prices = toArray(unitPrice);
      const suppliers = toArray(supplier);
      const contacts = toArray(contactPerson);
      const phones = toArray(supplierPhone);
      const factories = toArray(factoryName);
      const categories = toArray(category);
      const specifications = toArray(specification);

      const images = req.files || [];

      const stocks = items.map((_, i) => {
        const qty = parseFloat(qtys[i]) || 0;
        const cost = parseFloat(costs[i]) || 0;
        const price = parseFloat(prices[i]) || 0;

        return {
          itemName: items[i] || "",
          category: categories[i] || "General",
          specification: specifications[i] || "",
          quantity: qty,

          supplier: suppliers[i] || "",
          contactPerson: contacts[i] || "",
          supplierPhone: phones[i] || "",
          factoryName: factories[i] || "",

          unitCost: cost,
          unitPrice: price,

          paymentMethod,
          status: paymentMethod === "credit" ? "Pending" : "Paid",

          amountPaid: Number(amountPaid) || 0,

          total: qty * price,
          stockCost: qty * cost,

          productImage: images[i] ? images[i].filename : "",

          // ✅ FIXED HERE (REAL USER FROM DB)
          Attendant: req.user._id,

          createdAt: new Date(),
        };
      });

      await Stock.insertMany(stocks);

      return res.redirect("/stockDash");
    } catch (error) {
      console.error("Stock Save Error:", error);
      return res.status(500).render("stock", {
        error: error.message,
      });
    }
  },
);

/* =========================
   STOCK DASHBOARD
========================= */
router.get("/stockDash", async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ createdAt: -1 });

    const lowStockCount = await Stock.countDocuments({
      quantity: { $lte: 5 },
    });

    const supplierCredits = await Stock.find({ paymentMethod: "credit" });

    const suppliers = await Stock.distinct("supplier");

    const totalStockValue = stocks.reduce((total, item) => {
      return total + (item.quantity || 0) * (item.unitCost || 0);
    }, 0);

    res.render("stockDash", {
      stocks,
      lowStockCount,
      supplierCredits,
      suppliers,
      totalStockValue,
    });
  } catch (error) {
    console.error(error);

    res.render("stockDash", {
      stocks: [],
      lowStockCount: 0,
      supplierCredits: [],
      suppliers: [],
      totalStockValue: 0,
    });
  }
});
// supplier table
router.get("/supplierTable", async (req, res) => {
  try {
    const supplierCredits = await Stock.find({
      paymentMethod: "credit",
    }).sort({ createdAt: -1 });

    res.render("supplierTable", { supplierCredits });
  } catch (error) {
    console.error(error);
    res.render("supplierTable", { supplierCredits: [] });
  }
});
// comfirm payment
router.get("/supplier/pay/:id", async (req, res) => {
  try {
    await Stock.findByIdAndUpdate(req.params.id, {
      status: "Paid",
      paymentMethod: "cash-at-hand",
    });

    res.redirect("/supplierTable");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating payment status");
  }
});
// clearing off the debt
router.get("/supplier/clear/:id", async (req, res) => {
  await Stock.findByIdAndDelete(req.params.id);

  res.redirect("/supplierTable");
});

/* =========================
   EDIT STOCK
========================= */
router.get("/stock/edit/:id", async (req, res) => {
  try {
    const item = await Stock.findById(req.params.id);
    res.render("editStock", { item });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading edit page");
  }
});

/* =========================
   UPDATE STOCK
========================= */
router.post(
  "/stock/edit/:id",
  upload.array("productImage"),
  async (req, res) => {
    try {
      const updateData = { ...req.body };

      if (req.files && req.files.length > 0) {
        updateData.productImage = req.files[0].filename;
      }

      await Stock.findByIdAndUpdate(req.params.id, updateData);

      res.redirect("/stockDash");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error updating stock");
    }
  },
);

/* =========================
   DELETE STOCK
========================= */
router.get("/stock/delete/:id", async (req, res) => {
  try {
    await Stock.findByIdAndDelete(req.params.id);
    res.redirect("/stockDash");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting stock");
  }
});

/* =========================
   CONFIRM UPDATE
========================= */
router.get("/stock/confirm/:id", async (req, res) => {
  try {
    await Stock.findByIdAndUpdate(req.params.id, {
      updatedAt: new Date(),
      status: "updated",
    });

    res.redirect("/stockDash");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error confirming update");
  }
});

module.exports = router;
