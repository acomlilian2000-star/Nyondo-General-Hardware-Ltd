const express = require("express");
const router = express.Router();
const Stock = require("../models/Stock");

router.get("/Stockform", (req, res) => {
  res.render("Stock");
});

router.post("/Stock", async (req, res) => {
  try {
    // 1. ADD ALL FIELDS to the destructuring so they are "defined"
    const {
      itemName,
      quantity,
      supplier,
      unitCost,
      unitPrice,
      amountPaid,
      paymentMethod,
    } = req.body;

    // 2. Calculate the total FIRST
    const total = Number(quantity) * Number(unitPrice);

    // 3. Create ONE instance (Capital 'S' Stock)
    const newStock = new Stock({
      itemName,
      quantity: Number(quantity),
      supplier,
      paymentMethod,
      amountPaid: Number(amountPaid),
      unitCost: Number(unitCost),
      unitPrice: Number(unitPrice),
      total: total // Now the total is actually included!
    });

    console.log("Saving to DB:", newStock);

    await newStock.save();

    // 4. Success: Use RETURN to stop the function here
    return res.redirect("/Stockform");

  } catch (error) {
    console.error("Error caught:", error.message);

    // 5. Error: Use RETURN and check headers to prevent the 'Headers Sent' crash
    if (!res.headersSent) {
      // Pick ONE response method. 
      // Rendering the form again with the error is usually best.
      return res.status(400).render('Stock', { error: error.message });
    }
  }
});

module.exports = router;