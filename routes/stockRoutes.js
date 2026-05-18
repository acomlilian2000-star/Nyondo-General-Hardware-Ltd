const express = require("express");
const router = express.Router();
const Stock = require("../models/Stock");

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
router.post("/stock", async (req, res) => {
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
      amountPaid,
      paymentMethod,
    } = req.body;

    // Convert to arrays safely
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

    const stocks = items.map((_, i) => {
      const qty = parseFloat(qtys[i]) || 0;
      const price = parseFloat(prices[i]) || 0;
      const cost = parseFloat(costs[i]) || 0;

      return {
        itemName: items[i],
        quantity: qty,
        supplier: suppliers[i] || "",
        contactPerson: contacts[i] || "",
        supplierPhone: String(phones[i] || ""),
        factoryName: factories[i] || "",
        unitCost: cost,
        unitPrice: price,
        paymentMethod: paymentMethod || "",
        amountPaid: Number(amountPaid) || 0,
        total: qty * price,
        createdAt: new Date()
      };
    });

    await Stock.insertMany(stocks);

    return res.redirect("/stockform");

  } catch (error) {
    console.error("Stock Save Error:", error);
    return res.status(500).render("stock", {
      error: error.message,
    });
  }
});

/* =========================
   STOCK DASHBOARD DATA ROUTE
========================= */
router.get("/stockDash", async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ createdAt: -1 });

    const lowStockCount = await Stock.countDocuments({
      quantity: { $lte: 5 }
    });

    const supplierCredits = await Stock.find({ paymentMethod: "credit" });

    const suppliers = await Stock.distinct("supplier");

    res.render("stockDash", {
      stocks,
      lowStockCount,
      supplierCredits,
      suppliers
    });

  } catch (error) {
    console.error(error);
    res.render("stockDash", {
      stocks: [],
      lowStockCount: 0,
      supplierCredits: [],
      suppliers: []
    });
  }
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
router.post("/stock/edit/:id", async (req, res) => {
  try {
    await Stock.findByIdAndUpdate(req.params.id, req.body);
    res.redirect("/stockDash");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating stock");
  }
});

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
      status: "updated"
    });

    res.redirect("/stockDash");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error confirming update");
  }
});

module.exports = router;