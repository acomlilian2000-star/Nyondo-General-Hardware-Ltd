const express = require("express");
const router = express.Router();

const Deposit = require("../models/Deposit");
const Stock = require("../models/Stock");
const User = require("../models/User");
const Sales = require("../models/Sales");

/* =========================
   GET DEPOSIT FORM
========================= */
router.get("/salary", async (req, res) => {
  try {
    const products = await Stock.find({
      itemName: {
        $in: [
          "Cement CEM II",
          "Cement CEM III",
          "Iron Bars 10mm",
          "Iron Bars 12mm",
          "Iron Bars 16mm",
          "Iron Sheets"
        ]
      }
    });

    res.render("deposit", {
      products: products || [],
      attendant: req.user ? req.user.fullName : null
    });

  } catch (error) {
    console.log(error);
    res.status(500).send("Error loading deposit form");
  }
});


/* =========================
   POST DEPOSIT
========================= */
router.post("/deposit", async (req, res) => {

  try {

    const data = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).send("User not logged in");
    }

    let products = Array.isArray(data.product) ? data.product : [data.product];
    let specifications = Array.isArray(data.specification) ? data.specification : [data.specification];
    let quantities = Array.isArray(data.quantity) ? data.quantity : [data.quantity];

    let items = [];
    let total = 0;

    for (let i = 0; i < products.length; i++) {

      const product = await Stock.findById(products[i]);
      const qty = Number(quantities[i]) || 0;

      if (!product || qty <= 0) continue;

      if (product.quantity < qty) {
        return res.status(400).send(`Not enough stock for ${product.itemName}`);
      }

      /* =========================
         FIXED: stock should reduce correctly
      ========================= */
      const unitPrice = Number(product.unitPrice || 0);
      const itemTotal = qty * unitPrice;

      product.quantity -= qty;
      await product.save();

      items.push({
        product: product._id,
        itemName: product.itemName,
        specification: specifications[i] || "Pieces",
        quantity: qty,
        unitPrice,
        itemTotal
      });

      total += itemTotal;
    }

    const transportCost = Number(data.transportCost) || 0;
    const totalToPay = total + transportCost;
    const amountPaid = Number(data.amountPaid) || 0;

    const deposit = new Deposit({
      customerName: data.customerName,
      ninNumber: data.ninNumber,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      regDate: data.regDate,
      attendant: req.user._id,

      items,
      amount: total,
      distance: Number(data.distance) || 0,
      transportCost,
      totalToPay,
      amountPaid,
      balance: totalToPay - amountPaid,

      paymentMethod: (data.paymentMethod || "Cash"),

      paymentStatus: amountPaid >= totalToPay ? "Finished" : "Pending"
    });

    const saved = await deposit.save();

    return res.redirect(`/tempReceipt/${saved._id}`);

  } catch (err) {
    console.log(err);
    res.status(500).send("Error saving deposit");
  }
});


/* =========================
   RECEIPT
========================= */
router.get("/tempReceipt/:id", async (req, res) => {

  try {

    const deposit = await Deposit.findById(req.params.id)
      .populate("attendant", "fullName")
      .populate("items.product", "itemName unitPrice");

    if (!deposit) {
      return res.status(404).send("Receipt not found");
    }

    res.render("tempReceipt", {
      customer: deposit,
      items: deposit.items || [],
      payment: deposit
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Receipt error");
  }
});


/* =========================
   FINISH PAYMENT
========================= */
router.post("/deposit/finish/:id", async (req, res) => {

  try {

    const deposit = await Deposit.findById(req.params.id);

    if (!deposit) {
      return res.status(404).send("Deposit not found");
    }

    deposit.paymentStatus = "Finished";
    deposit.balance = 0;

    await deposit.save();

    return res.redirect(`/tempReceipt/${deposit._id}`);

  } catch (err) {
    console.log(err);
    res.status(500).send("Error updating payment");
  }
});


/* =========================
   ADMIN DASHBOARD (FIXED)
========================= */
router.get("/adminDash", async (req, res) => {

  try {

    const stocks = await Stock.find();
    const sales = await Sales.find();
    const deposits = await Deposit.find();

    const normalize = (val) =>
      (val || "").toString().toLowerCase();

    /* =========================
       CASH SALES ONLY
    ========================= */
    const totalCashSales = sales
      .filter(s => normalize(s.paymentMethod) === "cash")
      .reduce((sum, s) =>
        sum + Number(s.grandTotal || 0)
      , 0);

    /* =========================
       CREDIT / DEPOSITS
    ========================= */
    const totalCreditSales = deposits
      .reduce((sum, d) =>
        sum + Number(d.totalToPay || 0)
      , 0);

    /* =========================
       TOTAL STOCK VALUE (BUYING PRICE)
    ========================= */
    const totalStockValue = stocks.reduce((sum, s) =>
      sum + (Number(s.quantity || 0) * Number(s.unitCost || 0))
    , 0);

    /* =========================
       LOW STOCK COUNT
    ========================= */
    const lowStockCount = stocks.filter(s =>
      Number(s.quantity || 0) <= 10
    ).length;

    /* =========================
       SUPPLIERS OWED (CORRECT GROUP COUNT)
    ========================= */
    const supplierList = await Stock.distinct("supplier", {
      paymentMethod: "credit"
    });

    const suppliersOwed = supplierList.length;

    res.render("adminDash", {
      totalCashSales,
      totalCreditSales,
      totalStockValue,
      suppliersOwed,
      lowStockCount,
      deposits
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Dashboard error");
  }
});

module.exports = router;