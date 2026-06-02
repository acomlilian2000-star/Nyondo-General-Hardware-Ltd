const express = require("express");
const router = express.Router();
const passport = require("passport");

const Stock = require("../models/Stock");
const Sales = require("../models/Sales");
const Deposit = require("../models/Deposit");

const multer = require("multer");
const Supplier = require("../models/Supplier"); 

// multer handles image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });


  

function isLoggedIn(req, res, next) {
// a method provided by passport.js and . It checks the session stored on your server to see if the user has successfully logged in
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).send("Login required");
}


  

router.get("/stockDash", async (req, res) => {
  try {
    // fetching data
    const allStocks = await Stock.find().populate("Attendant").sort({ createdAt: -1 });
    const sales = await Sales.find();
    const deposits = await Deposit.find();
// calculating live inventory
    const liveStocks = allStocks.map(stock => {
      let soldQty = 0;
      sales.forEach(sale => {
        sale.items?.forEach(i => {
          if (i.product?.toString() === stock._id.toString()) soldQty += Number(i.quantity || 0);
        });
      });
      deposits.forEach(dep => {
        dep.items?.forEach(i => {
          if (i.product?.toString() === stock._id.toString()) soldQty += Number(i.quantity || 0);
        });
      });

      return {
        ...stock.toObject(),
        slug: stock.slug || stock.itemName.toLowerCase().replace(/\s+/g, "-"),
        currentQuantity: Math.max(0, (stock.quantity || 0) - soldQty)
      };
    });
    // finance and supplier analysis

    const totalStockValue = allStocks.reduce((sum, s) => sum + (Number(s.stockInQuantity || s.quantity || 0) * Number(s.unitCost || 0)), 0);

    const supplierCredits = await Supplier.find({ paymentMethod: { $regex: /^credit$/i } });
    const uniqueSuppliersOwed = await Supplier.distinct("supplier", { paymentMethod: { $regex: /^credit$/i }, status: "PENDING" });
// rendering and response
    res.render("stockDash", {
      user: req.user,
      liveStocks, allStocks, totalStockValue,
      lowStockCount: liveStocks.filter(i => i.currentQuantity <= 5).length,
      supplierCredits,
      suppliersOwed: uniqueSuppliersOwed.length,
      error_msg: req.flash("error_msg"),
      success_msg: req.flash("success_msg"),
      error: req.flash("error")
    });
  } catch (err) {
    console.error(err);
    res.render("stockDash", { liveStocks: [], allStocks: [], totalStockValue: 0, lowStockCount: 0, supplierCredits: [], suppliersOwed: 0, error_msg: req.flash("error_msg"), success_msg: req.flash("success_msg"), error: req.flash("error") });
  }
});


  
  // edit form loader
router.get("/stock/update/:id", isLoggedIn, async (req, res) => {
  try {
    const itemToUpdate = await Stock.findById(req.params.id);
    if (!itemToUpdate) {
      req.flash("error_msg", "Operational Error: That stock profile item could not be found.");
      return res.redirect("/stockDash"); 
    }
    res.render("editStock", { title: "Modify Product Inventory Record", stockItem: itemToUpdate, error_msg: req.flash("error_msg"), success_msg: req.flash("success_msg"), error: req.flash("error") });
  } catch (error) {
    res.status(500).send("Internal Server Exception.");
  }
});

// This is the "Write" operation that saves the changes.
router.post("/stock/update/:id", isLoggedIn, async (req, res) => {
  try {
    const { quantity, unitCost, unitPrice, supplier, contactPerson } = req.body;
    // Input Validation
    if (!quantity || isNaN(quantity) || Number(quantity) < 0) {
      req.flash("error_msg", "Validation Error: Invalid quantity.");
      return res.redirect(`/stock/update/${req.params.id}`);
    }
    // Database Update
    await Stock.findByIdAndUpdate(req.params.id, {
      quantity: Number(quantity),
      stockInQuantity: Number(quantity), 
      unitCost: Number(unitCost),
      unitPrice: Number(unitPrice),
      supplier, contactPerson
    });
    req.flash("success_msg", "Inventory product records updated successfully!");
    res.redirect("/stockDash"); 
    // error handling
  } catch (error) {
    req.flash("error_msg", "System Exception: " + error.message);
    res.redirect(`/stock/update/${req.params.id}`);
  }
});


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
          // This collects all the status flags
          statuses: { $push: "$status" }, 
          date: { $max: "$createdAt" }
        }
      },
      { $sort: { date: -1 } }
    ]);
// Final Data Transformation 
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


router.get("/stockform", isLoggedIn, (req, res) => {
  res.render("stock", { 
    formData: req.flash("formData")[0] || {}, 
    fieldErrors: req.flash("fieldErrors")[0] || {},
    error_msg: req.flash("error_msg"), 
    success_msg: req.flash("success_msg"), 
    error: req.flash("error") 
  });
});

router.post("/stock", isLoggedIn, upload.array("productImage"), async (req, res) => {
  try {
    const { 
      itemName, quantity, supplier, contactPerson, supplierPhone, 
      factoryName, unitCost, unitPrice, paymentMethod, category, specification 
    } = req.body;
    
    
    const fieldErrors = {};
    const requiredFields = [
      'itemName', 'quantity', 'unitCost', 'unitPrice', 'category', 
      'specification', 'supplier', 'contactPerson', 'supplierPhone', 
      'factoryName', 'paymentMethod'
    ];
    
    requiredFields.forEach(field => {
      const val = req.body[field];
      // Check if value is missing, empty string, or an array containing empty strings
      if (!val || (Array.isArray(val) ? val.some(v => !v || v.toString().trim() === '') : val.toString().trim() === '')) {
        fieldErrors[field] = true;
      }
    });

    if (Object.keys(fieldErrors).length > 0) {
      req.flash("formData", req.body);
      req.flash("fieldErrors", fieldErrors);
      req.flash("error_msg", "Please fill in all required fields marked in red.");
      return req.session.save(() => res.redirect("/stockform"));
    }

    const toArr = v => Array.isArray(v) ? v : [v];
    const items = toArr(itemName), qtys = toArr(quantity), costs = toArr(unitCost), 
          prices = toArr(unitPrice), cats = toArr(category), specs = toArr(specification);
    const images = req.files || [];

    for (let i = 0; i < items.length; i++) {
      await Supplier.create({
        productName: items[i].trim(),
        category: cats[i] || "General",
        specification: specs[i], 
        quantity: Number(qtys[i]),
        unitCost: Number(costs[i]),
        supplier: supplier.trim(),
        contactPerson: contactPerson.trim(),
        supplierPhone: supplierPhone.trim(),
        factoryName: factoryName.trim(),
        paymentMethod: paymentMethod.toLowerCase(),
        status: paymentMethod.toLowerCase() === "credit" ? "PENDING" : "PAID",
        Attendant: req.user?._id || null
      });

      const existingStock = await Stock.findOne({ itemName: items[i].trim() });
      if (existingStock) {
        existingStock.quantity += Number(qtys[i]);
        existingStock.stockInQuantity += Number(qtys[i]);
        existingStock.unitCost = Number(costs[i]);
        existingStock.unitPrice = Number(prices[i]);
        await existingStock.save();
      } else {
        await Stock.create({
          itemName: items[i].trim(),
          slug: items[i].trim().toLowerCase().replace(/\s+/g, "-"),
          category: cats[i] || "General",
          specification: specs[i],
          quantity: Number(qtys[i]),
          stockInQuantity: Number(qtys[i]),
          unitCost: Number(costs[i]),
          unitPrice: Number(prices[i]),
          productImage: images[i] ? images[i].filename : "",
          Attendant: req.user?._id || null
        });
      }
    }

    req.flash("success_msg", "Stock recorded successfully!");
    req.session.save(() => res.redirect("/stockDash"));
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "System error: " + err.message);
    req.session.save(() => res.redirect("/stockform"));
  }
});

module.exports = router;