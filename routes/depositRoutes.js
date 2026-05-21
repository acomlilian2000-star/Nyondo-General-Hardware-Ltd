const express = require("express");
const router = express.Router();

const Deposit = require("../models/Deposit");
const Stock = require("../models/Stock");


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

        res.render("deposit", {
            products: products || []
        });

    } catch (error) {

        console.log(error);
        res.status(500).send("Error loading deposit form");

    }

});


// ======================================
// POST DEPOSIT FORM (WITH STOCK CONTROL)
// ======================================
router.post("/deposit", async (req, res) => {

    try {

        const data = req.body;

        const quantity = Number(data.quantity) || 0;
        const unitPrice = Number(data.unitPrice) || 0;

        const amount = quantity * unitPrice;

        // ======================================
        // CHECK LOGIN USER
        // ======================================
        if (!req.user) {
            console.log("❌ No logged-in user found");
            return res.status(401).send("User not logged in");
        }

        // ======================================
        // FIND PRODUCT IN STOCK
        // ======================================
        const product = await Stock.findById(data.product);

        if (!product) {
            return res.status(404).send("Product not found");
        }

        // ======================================
        // CHECK STOCK AVAILABILITY
        // ======================================
        if (product.quantity < quantity) {
            return res.status(400).send("Not enough stock available");
        }

        // ======================================
        // REDUCE STOCK
        // ======================================
        product.quantity -= quantity;
        await product.save();

        // ======================================
        // SAVE DEPOSIT RECORD
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
        console.log("✅ SAVED:", saved);

        // ======================================
        // REDIRECT TO RECEIPT
        // ======================================
        res.redirect(`/tempReceipt/${saved._id}`);

    } catch (error) {

        console.log("❌ ERROR SAVING DEPOSIT:", error);
        res.status(500).send("Error saving deposit");

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

        console.log(error);
        res.status(500).send("Error loading receipt");

    }

});


// ======================================
// ADMIN DASHBOARD
// ======================================
router.get("/adminDash", async (req, res) => {

    try {

        const deposits = await Deposit
            .find()
            .populate("attendant")
            .populate("product");

        res.render("adminDash", {
            deposits: deposits || []
        });

    } catch (error) {

        console.log(error);
        res.status(500).send("Dashboard error");

    }

});


module.exports = router;