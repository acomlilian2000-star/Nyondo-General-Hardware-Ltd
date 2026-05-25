const mongoose = require("mongoose");

const StockSchema = new mongoose.Schema(
  {
    /* =========================
       BASIC PRODUCT INFO
    ========================= */
    itemName: {
      type: String,
      trim: true,
      required: true,
    },

    category: {
      type: String,
      trim: true,
      default: "General",
    },

    /* =========================
       STOCK QUANTITY
    ========================= */
    quantity: {
      type: Number,
      default: 0,
    },

    stockInQuantity: {
      type: Number,
      default: 0,
    },

    originalQuantity: {
      type: Number,
      default: 0,
    },

    /* =========================
       SUPPLIER INFO
    ========================= */
    supplier: {
      type: String,
      trim: true,
    },

    contactPerson: {
      type: String,
      trim: true,
    },

    supplierPhone: {
      type: String,
      trim: true,
    },

    factoryName: {
      type: String,
      trim: true,
    },

    /* =========================
       PRICING
    ========================= */
    unitCost: {
      type: Number,
      default: 0,
    },

    unitPrice: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      default: 0,
    },

    stockCost: {
      type: Number,
      default: 0,
    },

    /* =========================
       PAYMENT STATUS
    ========================= */
    paymentMethod: {
      type: String,
      enum: ["cash", "credit", "cash-at-hand"],
      default: "cash",
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },

    /* =========================
       SYSTEM FIELDS
    ========================= */
    Attendant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   AUTO CALCULATION (SAVE)
========================= */
StockSchema.pre("save", function (next) {
  const qty = Number(this.quantity || 0);
  const cost = Number(this.unitCost || 0);
  const price = Number(this.unitPrice || 0);

  this.stockCost = qty * cost;
  this.total = qty * price;

  if (!this.stockInQuantity) {
    this.stockInQuantity = qty;
  }

  next();
});

/* =========================
   AUTO CALCULATION (UPDATE)
========================= */
StockSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};

  const qty =
    update.quantity ??
    update.$set?.quantity ??
    0;

  const cost =
    update.unitCost ??
    update.$set?.unitCost ??
    0;

  const price =
    update.unitPrice ??
    update.$set?.unitPrice ??
    0;

  const stockCost = Number(qty) * Number(cost);
  const total = Number(qty) * Number(price);

  if (update.$set) {
    update.$set.stockCost = stockCost;
    update.$set.total = total;
  } else {
    update.stockCost = stockCost;
    update.total = total;
  }

  this.setUpdate(update);

  next();
});

module.exports = mongoose.model("Stock", StockSchema);