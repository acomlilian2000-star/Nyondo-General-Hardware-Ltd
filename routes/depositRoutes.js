const express = require("express");
const router = express.Router();

const Deposit = require("../models/Deposit");
const Stock = require("../models/Stock");
const User = require("../models/User");
const Sales = require("../models/Sales");
const Supplier = require("../models/Supplier");

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
      // These are populated by the middleware in app.js
      formData: req.flash("formData")[0] || {},
      fieldErrors: req.flash("fieldErrors")[0] || {},
      error_msg: req.flash("error_msg"),
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

    // 1. Server-Side Validation
    const fieldErrors = {};
    const requiredFields = [
      "customerName",
      "ninNumber",
      "customerPhone",
      "customerAddress",
      "regDate",
      "amountPaid",
    ];

    // Validate all required inputs
    requiredFields.forEach((field) => {
      if (!data[field] || data[field].toString().trim() === "") {
        fieldErrors[field] = true;
      }
    });

    // Validate NIN
    if (data.ninNumber && data.ninNumber.length !== 14)
      fieldErrors["ninNumber"] = true;

    // Validate that at least one product is selected
    if (
      !data.product ||
      (Array.isArray(data.product)
        ? data.product[0] === ""
        : data.product === "")
    ) {
      fieldErrors["product"] = true;
    }

    // If any error exists, redirect back to form
    if (Object.keys(fieldErrors).length > 0) {
      req.flash("fieldErrors", fieldErrors);
      req.flash("formData", data);
      // This is the specific error message you requested
      req.flash(
        "error_msg",
        "Empty form cannot be submitted. Please fill in all fields!",
      );
      return req.session.save(() => res.redirect("/salary"));
    }
    let products = Array.isArray(data.product) ? data.product : [data.product];
    let specifications = Array.isArray(data.specification)
      ? data.specification
      : [data.specification];
    let quantities = Array.isArray(data.quantity)
      ? data.quantity
      : [data.quantity];

    let items = [];
    let total = 0;

    for (let i = 0; i < products.length; i++) {
      if (!products[i] || products[i].trim() === "") continue;

      const product = await Stock.findById(products[i]);
      const qty = Number(quantities[i]) || 0;

      if (!product || qty <= 0) continue;

      if (product.quantity < qty) {
        req.flash("error_msg", `Not enough stock for ${product.itemName}`);
        return req.session.save(() => res.redirect("/salary"));
      }

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
      paymentStatus: amountPaid >= totalToPay ? "Finished" : "Pending",
    });

    await deposit.save();
    return res.redirect("/adminDash");
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Error saving deposit: " + err.message);
    return req.session.save(() => res.redirect("/salary"));
  }
});

/* =========================
   RECEIPT PAGE & OTHER ROUTES
========================= */
router.get("/deposit/receipt/:id", async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id)
      .populate("attendant", "fullName")
      .populate("items.product", "itemName unitPrice");
    if (!deposit) return res.status(404).send("Receipt not found");
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

router.get("/tempReceipt/:id", async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id)
      .populate("Attendant", "fullName")
      .populate("items.product", "itemName unitPrice");
    if (!deposit) return res.status(404).send("Receipt not found");
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

router.get("/deposit/edit/:id", async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).send("Deposit not found");
    res.render("editDeposit", { deposit });
  } catch (err) {
    console.log(err);
    res.status(500).send("Edit page error");
  }
});

router.post("/deposit/update/:id", async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).send("Deposit not found");
    const newPayment = Number(req.body.amountPaid || 0);
    deposit.amountPaid += newPayment;
    deposit.balance = deposit.totalToPay - deposit.amountPaid;
    deposit.balance <= 0
      ? ((deposit.balance = 0), (deposit.paymentStatus = "Finished"))
      : (deposit.paymentStatus = "Pending");
    await deposit.save();
    return res.redirect("/adminDash");
  } catch (err) {
    console.error(err);
    res.status(500).send("Update error");
  }
});

router.post("/deposit/finish/:id", async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).send("Deposit not found");
    deposit.paymentStatus = "Finished";
    deposit.balance = 0;
    await deposit.save();
    return res.redirect("/deposit/receipt/" + deposit._id);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error updating payment");
  }
});

router.get("/adminDash", async (req, res) => {
  try {
    const stocks = await Stock.find();
    const sales = await Sales.find();
    const deposits = await Deposit.find();
    const normalize = (val) => (val || "").toString().toLowerCase();
    const totalCashSales = sales
      .filter((s) => normalize(s.paymentMethod) === "cash")
      .reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);
    const totalCreditSales = deposits.reduce(
      (sum, d) => sum + Number(d.totalToPay || 0),
      0,
    );
    const totalStockValue = stocks.reduce(
      (sum, s) =>
        sum +
        Number(s.stockInQuantity || s.quantity || 0) * Number(s.unitCost || 0),
      0,
    );
    const liveStocks = stocks.map((stock) => {
      let soldQty = 0;
      sales.forEach((sale) =>
        sale.items?.forEach((item) =>
          item.product && item.product.toString() === stock._id.toString()
            ? (soldQty += Number(item.quantity || 0))
            : null,
        ),
      );
      deposits.forEach((dep) =>
        dep.items?.forEach((item) =>
          item.product && item.product.toString() === stock._id.toString()
            ? (soldQty += Number(item.quantity || 0))
            : null,
        ),
      );
      return {
        ...stock.toObject(),
        currentQuantity: Math.max(0, Number(stock.quantity || 0) - soldQty),
      };
    });
    const lowStockCount = liveStocks.filter(
      (item) => item.currentQuantity <= 5,
    ).length;
    const uniqueSuppliersOwed = await Supplier.distinct("supplier", {
      paymentMethod: { $regex: /^credit$/i },
      status: "PENDING",
    });
    res.render("adminDash", {
      totalCashSales,
      totalCreditSales,
      totalStockValue,
      suppliersOwed: uniqueSuppliersOwed.length,
      lowStockCount,
      deposits,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Dashboard error");
  }
});

module.exports = router;
