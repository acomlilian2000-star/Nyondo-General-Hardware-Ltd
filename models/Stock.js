const mongoose = require("mongoose");

const StockSchema = new mongoose.Schema(
  {
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

    quantity: {
      type: Number,
      default: 0,
    },

    // original registered stock (immutable reference)
    originalQuantity: {
      type: Number,
      default: 0,
    },

    supplier: {
      type: String,
      trim: true,
      // default: "Unknown",
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

    unitCost: {
      type: Number,
      default: 0,
    },

    unitPrice: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value > (this.unitCost || 0);
        },
        message: "unitPrice must be greater than unitCost",
      },
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "credit", "cash-at-hand"],
      default: "cash",
      trim: true,
    },

    // selling value (correct definition)
    total: {
      type: Number,
      default: 0,
    },

    // true stock cost value (BUYING PRICE × QUANTITY)
    stockCost: {
      type: Number,
      default: 0,
    },

    Attendant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   AUTO-CALCULATION FIX
   (THIS IS THE MOST IMPORTANT PART)
========================= */
StockSchema.pre("save", function (next) {
  const qty = Number(this.quantity || 0);
  const cost = Number(this.unitCost || 0);
  const price = Number(this.unitPrice || 0);

  // correct calculations
  this.stockCost = qty * cost; // real stock value
  this.total = qty * price;    // selling value

  // next();
});

/* =========================
   ALSO FIX UPDATE OPERATIONS
========================= */
StockSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (update.quantity != null || update.unitCost != null || update.unitPrice != null) {
    const qty = Number(update.quantity || 0);
    const cost = Number(update.unitCost || 0);
    const price = Number(update.unitPrice || 0);

    update.stockCost = qty * cost;
    update.total = qty * price;

    this.setUpdate(update);
  }

  next();
});

module.exports = mongoose.model("Stock", StockSchema);