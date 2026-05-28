// models/SupplyLog.js
const mongoose = require("mongoose");

const SupplierSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      trim: true,
      required: true,
    },
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    unitCost: {
      type: Number,
      required: true,
      default: 0,
    },
    /* =========================
       SUPPLIER TRACKING DETAILS
    ========================= */
    supplier: {
      type: String,
      trim: true,
      required: true,
    },
    contactPerson: {
      type: String,
      trim: true,
      default: "-",
    },
    supplierPhone: {
      type: String,
      trim: true,
      default: "-",
    },
    factoryName: {
      type: String,
      trim: true,
      default: "-",
    },
    /* =========================
       FINANCIALS & STATUS
    ========================= */
    paymentMethod: {
      type: String,
      enum: ["cash", "credit"],
      default: "cash",
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },
    Attendant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true, // Captures exact delivery dates automatically via createdAt
  }
);

// Optimize search queries by supplier name
SupplierSchema.index({ supplier: 1 });

module.exports = mongoose.model("Supplier", SupplierSchema);