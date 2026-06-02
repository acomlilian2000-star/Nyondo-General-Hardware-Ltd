const express = require("express");
const router = express.Router();
const Sales = require("../models/Sales");
const Stock = require("../models/Stock");
const Deposit = require("../models/Deposit");

//  Auth middleware checks if the user loggedin

function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect("/login");
  }
  next();
}
// fetching data from the data
async function getLiveStock() {
  const stocks = await Stock.find();
  const sales = await Sales.find();
  const deposits = await Deposit.find();
  // live inventory logic
  return stocks.map((stock) => {
    let soldQty = 0;
    // subtraction loops

    // Subtract Sales
    sales.forEach((sale) => {
      sale.items?.forEach((i) => {
        if (i.product?.toString() === stock._id.toString()) {
          soldQty += Number(i.quantity || 0);
        }
      });
    });

    // Subtract Deposits
    deposits.forEach((dep) => {
      dep.items?.forEach((i) => {
        if (i.product?.toString() === stock._id.toString()) {
          soldQty += Number(i.quantity || 0);
        }
      });
    });
    // final calculation and return
    return {
      ...stock.toObject(),
      currentQuantity: Math.max(0, Number(stock.quantity || 0) - soldQty),
    };
  });
}

//  SALES DASHBOARD

router.get("/salesDash", isLoggedIn, async (req, res) => {
  try {
    // date filtering
    let filter = {};

    if (req.query.month) {
      const startDate = new Date(req.query.month + "-01");
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      filter.createdAt = { $gte: startDate, $lt: endDate };
    }
    // retrieving data and populating

    const dbSales = await Sales.find(filter)
      .populate("items.product", "itemName image unitPrice")
      .populate("Attendant", "fullName")
      .sort({ createdAt: -1 });
    // time window block
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const todaySales = await Sales.find({
      createdAt: { $gte: start, $lte: end },
    });
    // calculation block
    let totalSalesToday = 0;
    let totalSalesAllTime = 0;
    let monthlyTotal = 0;

    todaySales.forEach((s) => (totalSalesToday += Number(s.grandTotal || 0)));

    dbSales.forEach((s) => {
      totalSalesAllTime += Number(s.grandTotal || 0);
      monthlyTotal += Number(s.grandTotal || 0);
    });

    //  LOW STOCK
    // inventory analysis
    const liveStock = await getLiveStock();

    const lowStockItems = liveStock.filter(
      (item) => Number(item.currentQuantity) <= 5,
    );

    res.render("salesDash", {
      dbSales,
      totalSalesToday,
      totalSalesAllTime,
      monthlyTotal,
      selectedMonth: req.query.month || "",
      lowStockCount: lowStockItems.length,
      lowStockItems,
      error_msg: req.flash("error_msg"),
      success_msg: req.flash("success_msg"),
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
      error_msg: req.flash("error_msg"),
      success_msg: req.flash("success_msg"),
    });
  }
});

//  SALES FORM PAGE

// form loader
router.get("/salesform", isLoggedIn, async (req, res) => {
  try {
    const items = await Stock.find({ quantity: { $gt: 0 } });

    res.render("sales", {
      products: items,
      error_msg: req.flash("error_msg"),
      success_msg: req.flash("success_msg"),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// sales processor
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
    // Input Verification
    if (!customerName || customerName.trim() === "") {
      req.flash("error_msg", "Customer name is required.");
      return res.redirect("/salesform");
    }

    if (!phoneNumber || phoneNumber.trim() === "") {
      req.flash("error_msg", "Phone number is required.");
      return res.redirect("/salesform");
    }

    if (!customerAddress || customerAddress.trim() === "") {
      req.flash("error_msg", "Customer address is required.");
      return res.redirect("/salesform");
    }

    if (
      !product ||
      (Array.isArray(product) && product.length === 0) ||
      product === ""
    ) {
      req.flash("error_msg", "You must add at least one valid product item.");
      return res.redirect("/salesform");
    }
    // array normalisation ensures that even if one item or multiple items are sold data is treated as an array
    product = Array.isArray(product) ? product : [product];
    specification = Array.isArray(specification)
      ? specification
      : [specification];
    quantity = Array.isArray(quantity) ? quantity : [quantity];
    unitPrice = Array.isArray(unitPrice) ? unitPrice : [unitPrice];

    let items = [];
    let total = 0;

    for (let i = 0; i < product.length; i++) {
      if (!product[i] || product[i] === "") {
        req.flash(
          "error_msg",
          `Row ${i + 1}: Please select a valid product choice.`,
        );
        return res.redirect("/salesform");
      }

      const qty = Number(quantity[i] || 0);
      const price = Number(unitPrice[i] || 0);

      if (qty <= 0) {
        req.flash(
          "error_msg",
          `Row ${i + 1}: Item entry quantity must be greater than zero.`,
        );
        return res.redirect("/salesform");
      }

      const stockItem = await Stock.findById(product[i]);
      if (!stockItem) {
        req.flash(
          "error_msg",
          "Selected product does not exist in stock profiles.",
        );
        return res.redirect("/salesform");
      }
      // compares the requested quantity against the available stock
      if (stockItem.quantity < qty) {
        req.flash(
          "error_msg",
          `Not enough stock for ${stockItem.itemName}. Available: ${stockItem.quantity}`,
        );
        return res.redirect("/salesform");
      }
      // deducts stock immediately for item inside the loop and saves
      stockItem.quantity = Number(stockItem.quantity) - qty;
      await stockItem.save();
      // financial calculation
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
    // transport calculations &ensures it is anumber
    const transport = Number(transportCost || 0);
    // creating a new sales record based on a model
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

    req.flash("success_msg", "Sale processed successfully!");
    return res.redirect("/salesDash");
  } catch (error) {
    console.error(error);
    req.flash("error_msg", "Error saving Sales: " + error.message);
    return res.redirect("/salesform");
  }
});

//  EDIT PAGE

router.get("/sales/edit/:id", isLoggedIn, async (req, res) => {
  try {
    // // fetches sales record and product and pre-fills the form
    const sale = await Sales.findById(req.params.id).populate("items.product");
    const products = await Stock.find();

    if (!sale) return res.status(404).send("Sale not found");

    res.render("editSale", {
      sale,
      products,
      error_msg: req.flash("error_msg"),
      success_msg: req.flash("success_msg"),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading sale");
  }
});

//  UPDATE SALE

router.post("/sales/edit/:id", isLoggedIn, async (req, res) => {
  try {
    // It verifies that the record exists before doing anything else.
    const sale = await Sales.findById(req.params.id);
    if (!sale) return res.status(404).send("Sale not found");
    // Updating Customer & Transport Details
    sale.customerName = req.body.customerName;
    sale.phoneNumber = req.body.phoneNumber;
    sale.customerAddress = req.body.customerAddress;
    sale.customerType = req.body.customerType;
    sale.distance = Number(req.body.distance || 0);
    sale.transportCost = Number(req.body.transportCost || 0);

    if (req.body.quantity) {
      let total = 0;
      //  updates the subTotal for each item, calculates the new grandTotal, and assigns these new values to the sale object.
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
    req.flash("success_msg", "Sales record updated successfully!");
    return res.redirect("/salesDash");
  } catch (error) {
    console.error(error);
    req.flash("error_msg", "Error updating sale: " + error.message);
    return res.redirect(`/sales/edit/${req.params.id}`);
  }
});

//  DELETE SALE
router.get("/sales/delete/:id", isLoggedIn, async (req, res) => {
  try {
    await Sales.findByIdAndDelete(req.params.id);
    req.flash("success_msg", "Sales transaction deleted successfully.");
    res.redirect("/salesDash");
  } catch (error) {
    console.error(error);
    req.flash("error_msg", "Error removing sales trace record.");
    res.redirect("/salesDash");
  }
});

//  RECEIPT

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
