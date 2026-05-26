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
          "Iron Sheets",
        ],
      },
    });

    res.render("deposit", {
      products: products || [],
      attendant: req.user ? req.user.fullName : null,
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

    let products = Array.isArray(data.product)
      ? data.product
      : [data.product];

    let specifications = Array.isArray(data.specification)
      ? data.specification
      : [data.specification];

    let quantities = Array.isArray(data.quantity)
      ? data.quantity
      : [data.quantity];

    let items = [];

    let total = 0;

    for (let i = 0; i < products.length; i++) {

      const product = await Stock.findById(products[i]);

      const qty = Number(quantities[i]) || 0;

      if (!product || qty <= 0) continue;

      if (product.quantity < qty) {
        return res
          .status(400)
          .send(`Not enough stock for ${product.itemName}`);
      }

      /* =========================
         STOCK REDUCTION
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

        itemTotal,
      });

      total += itemTotal;
    }

    const transportCost = Number(data.transportCost) || 0;

    const totalToPay = total + transportCost;

    const amountPaid = Number(data.amountPaid) || 0;

    const balance = totalToPay - amountPaid;

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

      balance,

      paymentMethod: data.paymentMethod || "Cash",

      paymentStatus:
        amountPaid >= totalToPay
          ? "Finished"
          : "Pending",
    });

    const saved = await deposit.save();

    /* =========================
       REDIRECT TO ADMIN DASH
    ========================= */
    return res.redirect("/adminDash");

  } catch (err) {
    console.log(err);

    res.status(500).send("Error saving deposit");
  }
});

/* =========================
   RECEIPT PAGE
========================= */
router.get("/deposit/receipt/:id", async (req, res) => {
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
      payment: deposit,
    });

  } catch (err) {
    console.log(err);

    res.status(500).send("Receipt error");
  }
});

/* =========================
   OLD TEMP RECEIPT ROUTE
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
      payment: deposit,
    });

  } catch (err) {
    console.log(err);

    res.status(500).send("Receipt error");
  }
});

/* =========================
   EDIT DEPOSIT PAGE
========================= */
router.get("/deposit/edit/:id", async (req, res) => {
  try {

    const deposit = await Deposit.findById(req.params.id);

    if (!deposit) {
      return res.status(404).send("Deposit not found");
    }

    res.render("editDeposit", {
      deposit,
    });

  } catch (err) {
    console.log(err);

    res.status(500).send("Edit page error");
  }
});

/* =========================
   UPDATE DEPOSIT PAYMENT
========================= */
router.post("/deposit/update/:id", async (req, res) => {
  try {

    const deposit = await Deposit.findById(req.params.id);

    if (!deposit) {
      return res.status(404).send("Deposit not found");
    }

    const newPayment = Number(req.body.amountPaid || 0);

    deposit.amountPaid += newPayment;

    deposit.balance =
      deposit.totalToPay - deposit.amountPaid;

    /* =========================
       AUTO COMPLETE PAYMENT
    ========================= */
    if (deposit.balance <= 0) {

      deposit.balance = 0;

      deposit.paymentStatus = "Finished";

    } else {

      deposit.paymentStatus = "Pending";
    }

    await deposit.save();

    return res.redirect("/adminDash");

  } catch (err) {
    console.log(err);

    res.status(500).send("Update error");
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

    return res.redirect(
      "/deposit/receipt/" + deposit._id
    );

  } catch (err) {
    console.log(err);

    res.status(500).send("Error updating payment");
  }
});

/* =========================
   ADMIN DASHBOARD
========================= */
router.get("/adminDash", async (req, res) => {

  try {

    /* =========================
       GET DATA
    ========================= */
    const stocks = await Stock.find();

    const sales = await Sales.find();

    const deposits = await Deposit.find();

    const normalize = (val) =>
      (val || "").toString().toLowerCase();

    /* =========================
       CASH SALES ONLY
    ========================= */
    const totalCashSales = sales
      .filter(
        (s) => normalize(s.paymentMethod) === "cash"
      )
      .reduce(
        (sum, s) =>
          sum + Number(s.grandTotal || 0),
        0
      );

    /* =========================
       CREDIT / DEPOSITS
    ========================= */
    const totalCreditSales = deposits.reduce(
      (sum, d) =>
        sum + Number(d.totalToPay || 0),
      0
    );

    /* =========================
       SAME LOGIC AS STOCK DASH
       TOTAL STOCK VALUE
    ========================= */
    const totalStockValue = stocks.reduce(
      (sum, s) => {

        const qty = Number(
          s.stockInQuantity ||
          s.quantity ||
          0
        );

        const cost = Number(
          s.unitCost || 0
        );

        return sum + (qty * cost);

      },
      0
    );

    /* =========================
       SAME LOGIC AS STOCK DASH
       LOW STOCK ALERTS
    ========================= */
    const liveStocks = stocks.map(stock => {

      let soldQty = 0;

      /* =========================
         SALES REDUCTION
      ========================= */
      sales.forEach(sale => {

        sale.items?.forEach(item => {

          if (
            item.product &&
            item.product.toString() ===
            stock._id.toString()
          ) {
            soldQty += Number(
              item.quantity || 0
            );
          }

        });

      });

      /* =========================
         DEPOSIT REDUCTION
      ========================= */
      deposits.forEach(dep => {

        dep.items?.forEach(item => {

          if (
            item.product &&
            item.product.toString() ===
            stock._id.toString()
          ) {
            soldQty += Number(
              item.quantity || 0
            );
          }

        });

      });

      return {
        ...stock.toObject(),

        currentQuantity: Math.max(
          0,
          Number(stock.quantity || 0) - soldQty
        )
      };

    });

    const lowStockCount = liveStocks.filter(
      item => item.currentQuantity <= 5
    ).length;

    /* =========================
       SUPPLIERS OWED
    ========================= */
    const supplierList =
      await Stock.distinct("supplier", {
        paymentMethod: "credit",
      });

    const suppliersOwed =
      supplierList.length;

    /* =========================
       RENDER
    ========================= */
    res.render("adminDash", {

      totalCashSales,

      totalCreditSales,

      totalStockValue,

      suppliersOwed,

      lowStockCount,

      deposits,
    });

  } catch (err) {

    console.log(err);

    res.status(500).send("Dashboard error");
  }
});

module.exports = router;