const express = require("express");
const router = express.Router();
const Stock = require("../models/Stock");

router.get("/Stockform", (req, res) => {
  res.render("Stock");
});

router.post("/Stock", async (req, res) => {
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

    // Convert arrays properly
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

      const qtyRaw = parseFloat(qtys[i]);
      const priceRaw = parseFloat(prices[i]);
      const costRaw = parseFloat(costs[i]);

      const qty = isNaN(qtyRaw) ? 0 : qtyRaw;
      const price = isNaN(priceRaw) ? 0 : priceRaw;
      const cost = isNaN(costRaw) ? 0 : costRaw;

      return {
        itemName: items[i],
        quantity: qty,
        supplier: suppliers[i] || "",
        contactPerson: contacts[i] || "",
        supplierPhone: String(phones[i] || ""),
        factoryName: factories[i] || "",
        unitCost: cost,
        unitPrice: price,
        paymentMethod,
        amountPaid: Number(amountPaid) || 0,
        total: qty * price
      };
    });

    await Stock.insertMany(stocks);

    console.log("Saved successfully:", stocks);

    return res.redirect("/Stockform");

  } catch (error) {
    console.error("Error caught:", error.message);

    if (!res.headersSent) {
      return res.status(400).render("Stock", {
        error: error.message
      });
    }
  }
});

module.exports = router;