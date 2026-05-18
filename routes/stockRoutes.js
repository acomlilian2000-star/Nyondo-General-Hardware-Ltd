const express = require("express");
const router = express.Router();
const Stock = require("../models/Stock");

// GET stock form page
router.get("/stockform", (req, res) => {
  res.render("stock");
});

// POST stock data
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
      };
    });

    await Stock.insertMany(stocks);

    console.log("Saved successfully:", stocks);

    return res.redirect("/stockform");

  } catch (error) {
    console.error("Error caught:", error);

    return res.status(500).render("stock", {
      error: error.message,
    });
  }
});

module.exports = router;