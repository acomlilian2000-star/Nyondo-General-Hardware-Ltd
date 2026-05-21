const express = require("express");
const router = express.Router();

const Deposit = require("../models/Deposit");
const Stock = require("../models/Stock");
const User = require("../models/User");
const Sales = require("../models/Sales");


// ======================================
// GET DEPOSIT FORM (SALARY PRODUCTS ONLY)
// ======================================
router.get("/salary", async (req, res) => {

    try {

        const products = await Stock.find({
            itemName: {
                $in: ["Cement", "Iron Bars", "Iron Sheets"]
            }
        });

        console.log("📦 PRODUCTS LOADED:", products.length);

        res.render("deposit", {
            products: products || []
        });

    } catch (error) {

        console.log("❌ ERROR LOADING FORM:", error);
        res.status(500).send("Error loading deposit form");

    }

});


// ======================================
// POST DEPOSIT FORM
// ======================================
router.post("/deposit", async (req, res) => {

    try {

        console.log("🔥 DEPOSIT ROUTE HIT");
        console.log("📩 BODY:", req.body);

        const data = req.body;

        const quantity = Number(data.quantity) || 0;
        const unitPrice = Number(data.unitPrice) || 0;
        const amount = quantity * unitPrice;

        // ======================================
        // CHECK USER
        // ======================================
        if (!req.user || !req.user._id) {
            console.log("❌ USER NOT LOGGED IN");
            return res.status(401).send("User not logged in");
        }

        console.log("👤 USER:", req.user._id);

        // ======================================
        // FIND PRODUCT
        // ======================================
        const product = await Stock.findById(data.product);

        if (!product) {
            console.log("❌ PRODUCT NOT FOUND");
            return res.status(404).send("Product not found");
        }

        // ======================================
        // STOCK CHECK
        // ======================================
        if (product.quantity < quantity) {
            console.log("❌ NOT ENOUGH STOCK");
            return res.status(400).send("Not enough stock available");
        }

        // ======================================
        // REDUCE STOCK
        // ======================================
        product.quantity -= quantity;
        await product.save();

        console.log("📉 STOCK UPDATED:", product.quantity);

        // ======================================
        // CREATE DEPOSIT
        // ======================================
        const deposit = new Deposit({
            customerName: data.customerName,
            ninNumber: data.ninNumber,
            customerPhone: data.customerPhone,
            customerAddress: data.customerAddress,
            regDate: data.regDate,

            attendant: req.user._id,
            product: data.product,

            specification: data.specification,
            quantity,
            unitPrice,
            amount,

            distance: Number(data.distance) || 0,
            transportCost: Number(data.transportCost) || 0,
            totalToPay: Number(data.totalToPay) || 0,
            amountPaid: Number(data.amountPaid) || 0,
            balance: Number(data.balance) || 0,

            paymentMethod: data.paymentMethod
        });

        const saved = await deposit.save();

        console.log("✅ SAVED SUCCESSFULLY:", saved._id);

        return res.redirect(`/tempReceipt/${saved._id}`);

    } catch (error) {

        console.log("❌ ERROR SAVING DEPOSIT:", error);
        return res.status(500).send("Error saving deposit");

    }

});


// ======================================
// RECEIPT PAGE
// ======================================
router.get("/tempReceipt/:id", async (req, res) => {

    try {

        const deposit = await Deposit
            .findById(req.params.id)
            .populate("attendant")
            .populate("product");

        if (!deposit) {
            return res.status(404).send("Receipt not found");
        }

        res.render("tempReceipt", {
            customer: deposit,
            items: [
                {
                    itemName: deposit.product?.itemName || "Deleted Product",
                    specification: deposit.specification,
                    quantity: deposit.quantity,
                    unitPrice: deposit.unitPrice,
                    itemTotal: deposit.amount
                }
            ],
            payment: deposit
        });

    } catch (error) {

        console.log("❌ RECEIPT ERROR:", error);
        res.status(500).send("Error loading receipt");

    }

});


// ======================================
// ADMIN DASHBOARD
// ======================================
router.get("/adminDash", async (req, res) => {

    try {

        const stocks = await Stock.find();
        const sales = await Sales.find();
        const deposits = await Deposit.find();

        // ================= NORMALIZE PAYMENT METHOD =================
        const normalize = (val) => (val || "").toString().toLowerCase();

        // ================= CASH SALES =================
        const totalCashSales = sales
            .filter(s => normalize(s.paymentMethod) === "cash")
            .reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);

        // ================= CREDIT SALES =================
        const totalCreditSales = sales
            .filter(s => normalize(s.paymentMethod) === "credit")
            .reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);

        // ================= STOCK VALUE =================
        const totalStockValue = stocks.reduce((sum, s) => {
            return sum + (Number(s.quantity || 0) * Number(s.unitPrice || 0));
        }, 0);

        // ================= LOW STOCK =================
        const lowStockCount = stocks.filter(s => Number(s.quantity) < 10).length;

        // ================= SUPPLIERS OWED (FIXED SAFELY) =================
        const suppliersOwed = stocks.reduce((sum, s) => {
            return sum + Number(
                s.supplierOwed ||
                s.supplierBalance ||
                s.amountOwed ||
                0
            );
        }, 0);

        console.log("💰 CASH:", totalCashSales);
        console.log("💳 CREDIT:", totalCreditSales);
        console.log("📦 STOCK:", totalStockValue);
        console.log("🏦 OWED:", suppliersOwed);

        return res.render("adminDash", {
            totalCashSales,
            totalCreditSales,
            totalStockValue,
            suppliersOwed,
            lowStockCount,
            deposits
        });

    } catch (err) {
        console.log("❌ ADMIN DASH ERROR:", err);
        res.status(500).send("Dashboard error");
    }
});
module.exports = router;