const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema({

    // ================= CUSTOMER DETAILS =================
    customerName: {
        type: String,
        required: true,
        trim: true
    },

    ninNumber: {
        type: String,
        required: true,
        uppercase: true,
        minlength: 14,
        maxlength: 14
    },

    customerPhone: {
        type: String,
        required: true
    },

    customerAddress: {
        type: String,
        required: true,
        trim: true
    },

    regDate: {
        type: Date,
        required: true
    },

    // ================= ATTENDANT =================
    attendant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },

    // ================= PRODUCT DETAILS =================
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stock",
        required: true
    },

    specification: {
        type: String,
        enum: ["Bags", "Pieces"],
        required: true
    },

    quantity: {
        type: Number,
        required: true,
        min: 1
    },

    unitPrice: {
        type: Number,
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    // ================= PAYMENT DETAILS =================
    distance: {
        type: Number,
        default: 0
    },

    transportCost: {
        type: Number,
        default: 30000
    },

    totalToPay: {
        type: Number,
        required: true
    },

    amountPaid: {
        type: Number,
        required: true
    },

    balance: {
        type: Number,
        required: true
    },

    paymentMethod: {
        type: String,
        enum: ["Bank", "Mobile Money", "Cash"],
        required: true
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Deposit", depositSchema);