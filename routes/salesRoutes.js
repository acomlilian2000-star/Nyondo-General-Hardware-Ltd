const express = require("express");
const router = express.Router();
const Sales = require("../models/Sales");
const Stock = require("../models/Stock");

/* =========================
   AUTH MIDDLEWARE
========================= */
function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect("/login");
  }
  next();
}

/* =========================
   SHARED STOCK CALC (FIXED)
========================= */
async function getLiveStock() {
  const stocks = await Stock.find();
  const sales = await Sales.find();

  return stocks.map((stock) => {
    let soldQty = 0;

    sales.forEach((sale) => {
      sale.items?.forEach((i) => {
        if (i.product?.toString() === stock._id.toString()) {
          soldQty += Number(i.quantity || 0);
        }
      });
    });

    return {
      ...stock.toObject(),
      currentQuantity: Math.max(0, Number(stock.quantity || 0) - soldQty),
    };
  });
}

/* =========================
   SALES DASHBOARD (CORRECTED)
========================= */
router.get("/salesDash", isLoggedIn, async (req, res) => {
  try {
    let filter = {};

    // Apply month filter for sales list if present
    if (req.query.month) {
      const startDate = new Date(req.query.month + "-01");
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      filter.createdAt = { $gte: startDate, $lt: endDate };
    }

    const dbSales = await Sales.find(filter)
      .populate("items.product", "itemName image unitPrice")
      .populate("Attendant", "fullName")
      .sort({ createdAt: -1 });

    /* =========================
       TOTALS
    ========================= */
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const todaySales = await Sales.find({
      createdAt: { $gte: start, $lte: end },
    });

    let totalSalesToday = 0;
    let totalSalesAllTime = 0;
    let monthlyTotal = 0;

    todaySales.forEach((s) => (totalSalesToday += Number(s.grandTotal || 0)));

    dbSales.forEach((s) => {
      totalSalesAllTime += Number(s.grandTotal || 0);
      monthlyTotal += Number(s.grandTotal || 0);
    });

    /* =========================
       LOW STOCK (FIX LOGIC)
    ========================= */
    // 1. Get the actual live stock tracking array
    const liveStock = await getLiveStock();

    // 2. Filter live items where current calculated stock is between 0 and 5
    const lowStockItems = liveStock.filter(
      (item) => item.currentQuantity >= 0 && item.currentQuantity <= 5
    );

    res.render("salesDash", {
      dbSales,
      totalSalesToday,
      totalSalesAllTime,
      monthlyTotal,
      selectedMonth: req.query.month || "",
      lowStockCount: lowStockItems.length,
      lowStockItems, // This now passes the modified items containing 'currentQuantity'
    });
  } catch (err) {
    console.error(err);

    res.render("salesDash", {
      dbSales: [],
      totalSalesToday: 0,
      totalSalesAllTime: 0,
      monthlyTotal: 0,
      selectedMonth: "",
      lowStockCount: 0,
      lowStockItems: [],
    });
  }
});

/* =========================
   SALES FORM PAGE
========================= */
router.get("/salesform", isLoggedIn, async (req, res) => {
  try {
    const items = await Stock.find({ quantity: { $gt: 0 } });
    res.render("sales", { products: items });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

/* =========================
   CREATE SALE
========================= */
router.post("/Sales", isLoggedIn, async (req, res) => {
  try {
    if (!req.user) return res.status(401).send("User not logged in");

    let {
      date,
      product,
      specification,
      quantity,
      unitPrice,
      customerName,
      phoneNumber,
      customerAddress,
      customerType,
      distance,
      transportCost,
    } = req.body;

    product = Array.isArray(product) ? product : [product];
    specification = Array.isArray(specification) ? specification : [specification];
    quantity = Array.isArray(quantity) ? quantity : [quantity];
    unitPrice = Array.isArray(unitPrice) ? unitPrice : [unitPrice];

    let items = [];
    let total = 0;

    for (let i = 0; i < product.length; i++) {
      const qty = Number(quantity[i] || 0);
      const price = Number(unitPrice[i] || 0);

      if (!product[i] || qty <= 0 || price <= 0) continue;

      const stockItem = await Stock.findById(product[i]);
      if (!stockItem) return res.status(404).send("Product not found");

      if (stockItem.quantity < qty) {
        return res
          .status(400)
          .send(`Not enough stock for ${stockItem.itemName}`);
      }

      stockItem.quantity = Number(stockItem.quantity) - qty;
      await stockItem.save();

      const subTotal = qty * price;
      total += subTotal;

      items.push({
        product: stockItem._id,
        itemName: stockItem.itemName,
        specification: specification[i] || "-",
        quantity: qty,
        unitPrice: price,
        subTotal,
      });
    }

    const transport = Number(transportCost || 0);

    const newSale = new Sales({
      date: date || new Date(),
      customerName,
      phoneNumber: phoneNumber || "-",
      customerAddress: customerAddress || "-",
      customerType: customerType || "individual",
      items,
      subTotal: total,
      grandTotal: total + transport,
      transportCost: transport,
      distance: Number(distance || 0),
      paymentMethod: "cash",
      Attendant: req.user._id,
    });

    await newSale.save();

    return res.redirect("/salesDash");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Error saving Sales: " + error.message);
  }
});

/* =========================
   EDIT PAGE
========================= */
router.get("/sales/edit/:id", isLoggedIn, async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id).populate("items.product");
    const products = await Stock.find();

    if (!sale) return res.status(404).send("Sale not found");

    res.render("editSale", { sale, products });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading sale");
  }
});

/* =========================
   UPDATE SALE (FULL FIX)
========================= */
router.post("/sales/edit/:id", isLoggedIn, async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id);
    if (!sale) return res.status(404).send("Sale not found");

    sale.customerName = req.body.customerName;
    sale.phoneNumber = req.body.phoneNumber;
    sale.customerAddress = req.body.customerAddress;
    sale.customerType = req.body.customerType;
    sale.distance = Number(req.body.distance || 0);
    sale.transportCost = Number(req.body.transportCost || 0);

    if (req.body.quantity) {
      let total = 0;

      sale.items.forEach((item, i) => {
        const qty = Number(req.body.quantity[i] || item.quantity);
        const price = Number(req.body.unitPrice[i] || item.unitPrice);

        item.quantity = qty;
        item.unitPrice = price;
        item.specification = req.body.specification?.[i] || item.specification;

        item.subTotal = qty * price;
        total += item.subTotal;
      });

      sale.subTotal = total;
      sale.grandTotal = total + sale.transportCost;
    }

    await sale.save();

    return res.redirect("/salesDash");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating sale");
  }
});

/* =========================
   DELETE SALE
========================= */
router.get("/sales/delete/:id", isLoggedIn, async (req, res) => {
  try {
    await Sales.findByIdAndDelete(req.params.id);
    res.redirect("/salesDash");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting sale");
  }
});

/* =========================
   RECEIPT
========================= */
router.get("/sales/receipt/:id", isLoggedIn, async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id)
      .populate("items.product", "itemName image unitPrice")
      .populate("Attendant", "fullName");

    if (!sale) return res.status(404).send("Sale not found");

    res.render("receipt", { sale });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading receipt");
  }
});

module.exports = router;