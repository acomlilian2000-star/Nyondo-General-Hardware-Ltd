const mongoose = require("mongoose");

/* =========================
   DEPOSIT ITEMS SCHEMA
========================= */
const DepositItemSchema = new mongoose.Schema({

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stock",
        required: true
    },

    itemName: {
        type: String,
        required: true,
        trim: true
    },

    specification: {
        type: String,
        enum: ["Bags", "Pieces"],
        required: true,
        default: "Pieces"
    },

    quantity: {
        type: Number,
        required: true,
        min: 1
    },

    unitPrice: {
        type: Number,
        required: true,
        min: 0
    },

    itemTotal: {
        type: Number,
        required: true,
        min: 0
    }

}, { _id: false });

/* =========================
   MAIN DEPOSIT SCHEMA
========================= */
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
        maxlength: 14,
        trim: true
    },

    customerPhone: {
        type: String,
        required: true,
        trim: true
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

    // ================= ATTENDANT (FROM DATABASE USER) =================
    attendant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // ================= PRODUCTS =================
    items: {
        type: [DepositItemSchema],
        required: true,
        validate: {
            validator: function (v) {
                return Array.isArray(v) && v.length > 0;
            },
            message: "At least one product item is required"
        }
    },

    // ================= TOTALS =================
    amount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },

    // ================= PAYMENT DETAILS =================
    distance: {
        type: Number,
        default: 0,
        min: 0
    },

    transportCost: {
        type: Number,
        default: 30000,
        min: 0
    },

    totalToPay: {
        type: Number,
        required: true,
        min: 0
    },

    amountPaid: {
        type: Number,
        required: true,
        min: 0
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