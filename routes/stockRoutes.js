const express = require("express");
const router = express.Router();
const passport = require("passport");

const Stock = require("../models/Stock");
const Sales = require("../models/Sales");
const Deposit = require("../models/Deposit");

const multer = require("multer");
const Supplier = require("../models/Supplier"); 

/* =========================
   MULTER
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
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
    const allStocks = await Stock.find().populate("Attendant").sort({ createdAt: -1 });
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
        slug: stock.slug || stock.itemName.toLowerCase().replace(/\s+/g, "-"),
        currentQuantity: Math.max(0, (stock.quantity || 0) - soldQty)
      };
    });

    const totalStockValue = allStocks.reduce((sum, s) => {
      const qty = Number(s.stockInQuantity || s.quantity || 0);
      const cost = Number(s.unitCost || 0);
      return sum + qty * cost;
    }, 0);

    const supplierCredits = await Supplier.find({
      paymentMethod: { $regex: /^credit$/i }
    });

    const uniqueSuppliersOwed = await Supplier.distinct("supplier", {
      paymentMethod: { $regex: /^credit$/i },
      status: "PENDING"
    });

    res.render("stockDash", {
      liveStocks,
      allStocks,
      totalStockValue,
      lowStockCount: liveStocks.filter(i => i.currentQuantity <= 5).length,
      supplierCredits,
      suppliersOwed: uniqueSuppliersOwed.length,
      error_msg: req.flash("error_msg"),
      success_msg: req.flash("success_msg"),
      error: req.flash("error")
    });

  } catch (err) {
    console.error(err);
    res.render("stockDash", {
      liveStocks: [],
      allStocks: [],
      totalStockValue: 0,
      lowStockCount: 0,
      supplierCredits: [],
      suppliersOwed: 0,
      error_msg: req.flash("error_msg"),
      success_msg: req.flash("success_msg"),
      error: req.flash("error")
    });
  }
});

/* =========================================================
   GET - RENDER EDIT STOCK FORM
   ========================================================= */
router.get("/stock/update/:id", isLoggedIn, async (req, res) => {
  try {
    const itemToUpdate = await Stock.findById(req.params.id);
    
    if (!itemToUpdate) {
      req.flash("error_msg", "Operational Error: That stock profile item could not be found.");
      return res.redirect("/stockDash"); 
    }

    res.render("editStock", {
      title: "Modify Product Inventory Record",
      stockItem: itemToUpdate,
      error_msg: req.flash("error_msg"),
      success_msg: req.flash("success_msg"),
      error: req.flash("error")
    });
  } catch (error) {
    console.error("Error fetching single stock record:", error);
    res.status(500).send("Internal Server Exception.");
  }
});

/* =========================================================
   POST - EXECUTE DATABASE INVENTORY MODIFICATION
   ========================================================= */
router.post("/stock/update/:id", isLoggedIn, async (req, res) => {
  try {
    const { quantity, unitCost, unitPrice, supplier, contactPerson } = req.body;

    if (!quantity || isNaN(quantity) || Number(quantity) < 0) {
      req.flash("error_msg", "Validation Error: Invalid quantity.");
      return res.redirect(`/stock/update/${req.params.id}`);
    }

    // Update fields including Supplier and Contact Person
    await Stock.findByIdAndUpdate(req.params.id, {
      quantity: Number(quantity),
      stockInQuantity: Number(quantity), 
      unitCost: Number(unitCost),
      unitPrice: Number(unitPrice),
      supplier: supplier,           // Added
      contactPerson: contactPerson  // Added
    });

    req.flash("success_msg", "Inventory product records updated successfully!");
    res.redirect("/stockDash"); 
  } catch (error) {
    console.error("Update error:", error);
    req.flash("error_msg", "System Exception: " + error.message);
    res.redirect(`/stock/update/${req.params.id}`);
  }
});

/* =========================
   SUPPLIER TABLE (GROUPED)
========================= */
router.get("/supplierTable", async (req, res) => {
  try {
    const groupedSuppliers = await Supplier.aggregate([
      {
        $group: {
          _id: { $toLower: "$supplier" },
          supplierName: { $first: "$supplier" },
          contactPerson: { $first: "$contactPerson" },
          supplierPhone: { $first: "$supplierPhone" },
          factoryName: { $first: "$factoryName" },
          items: { $push: { itemName: "$productName", quantity: "$quantity" } },
          totalQuantity: { $sum: "$quantity" },
          totalAmount: { $sum: { $multiply: [ { $ifNull: ["$quantity", 0] }, { $ifNull: ["$unitCost", 0] } ] } },
          statuses: { $push: "$status" }, 
          date: { $max: "$createdAt" }
        }
      },
      { $sort: { date: -1 } }
    ]);

    const supplierCredits = groupedSuppliers.map(group => {
      const finalStatus = group.statuses.includes("PENDING") ? "PENDING" : "PAID";
      return {
        _id: group.supplierName, 
        supplier: group.supplierName || "Unknown",
        contactPerson: group.contactPerson || "-",
        supplierPhone: group.supplierPhone || "-",
        factoryName: group.factoryName || "-",
        items: group.items,
        quantity: group.totalQuantity,
        totalAmount: group.totalAmount,
        date: group.date,
        status: finalStatus
      };
    });

    res.render("supplierTable", {
      supplierCredits,
      error_msg: req.flash("error_msg"),
      success_msg: req.flash("success_msg"),
      error: req.flash("error")
    });
  } catch (err) {
    console.error(err);
    res.render("supplierTable", { supplierCredits: [], error_msg: req.flash("error_msg"), success_msg: req.flash("success_msg"), error: req.flash("error") });
  }
});

/* =========================
   MARK SUPPLIER AS PAID
========================= */
router.get("/supplier/mark-paid/:id", async (req, res) => {
  try {
    await Supplier.updateMany({ supplier: req.params.id, status: "PENDING" }, { $set: { status: "PAID", paymentMethod: "cash" } });
    req.flash("success_msg", "Supplier account statements cleared.");
    res.redirect("/supplierTable");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to settle payment.");
    res.redirect("/supplierTable");
  }
});

/* =========================
   STOCK FORM / POST CODES
========================= */
router.get("/stockform", isLoggedIn, (req, res) => {
  res.render("stock", { error_msg: req.flash("error_msg"), success_msg: req.flash("success_msg"), error: req.flash("error") });
});

router.post("/stock", isLoggedIn, upload.array("productImage"), async (req, res) => {
  try {
    const { itemName, quantity, supplier, contactPerson, supplierPhone, factoryName, unitCost, unitPrice, paymentMethod, category } = req.body;
    
    // Validation
    if (!supplier || !contactPerson || !supplierPhone || !factoryName || !paymentMethod || !itemName) {
      req.flash("error_msg", "All fields are required.");
      return res.redirect("/stockform");
    }

    const toArr = v => Array.isArray(v) ? v : [v];
    const items = toArr(itemName), qtys = toArr(quantity), costs = toArr(unitCost), prices = toArr(unitPrice), cats = toArr(category), methods = toArr(paymentMethod);
    const images = req.files || [];

    for (let i = 0; i < items.length; i++) {
      const qty = Number(qtys[i]), cost = Number(costs[i]), price = Number(prices[i]);
      const method = (methods[i] || methods[0] || "cash").toLowerCase();
      
      await Supplier.create({
        productName: items[i].trim(),
        category: cats[i] || "General",
        quantity: qty,
        unitCost: cost,
        supplier: supplier.trim(),
        contactPerson: contactPerson,
        supplierPhone: supplierPhone,
        factoryName: factoryName,
        paymentMethod: method,
        status: method === "credit" ? "PENDING" : "PAID",
        Attendant: req.user?._id || null
      });

      const existingStock = await Stock.findOne({ itemName: items[i].trim() });
      if (existingStock) {
        existingStock.quantity += qty;
        existingStock.stockInQuantity += qty;
        existingStock.unitCost = cost;
        existingStock.unitPrice = price;
        await existingStock.save();
      } else {
        await Stock.create({
          itemName: items[i].trim(),
          slug: items[i].trim().toLowerCase().replace(/\s+/g, "-"),
          category: cats[i] || "General",
          quantity: qty,
          stockInQuantity: qty,
          unitCost: cost,
          unitPrice: price,
          productImage: images[i] ? images[i].filename : "",
          Attendant: req.user?._id || null
        });
      }
    }

    req.flash("success_msg", "Stock recorded successfully!");
    res.redirect("/stockDash");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "System error: " + err.message);
    res.redirect("/stockform");
  }
});

module.exports = router;