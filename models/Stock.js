const mongoose = require("mongoose");

const StockSchema = new mongoose.Schema(
  {
   
    itemName: {
      type: String,
      trim: true,
      required: true,
      unique: true, 
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

    stockInQuantity: {
      type: Number,
      default: 0,
    },

    originalQuantity: {
      type: Number,
      default: 0,
    },

   
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

    productImage: {
      type: String,
      default: "",
    },

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


StockSchema.pre("save", function (next) {
  const qty = Number(this.quantity || 0);
  const cost = Number(this.unitCost || 0);
  const price = Number(this.unitPrice || 0);

  // AUTO CALCULATIONS
  this.stockCost = qty * cost;
  this.total = qty * price;

  // INITIAL STOCK TRACKING
  if (!this.stockInQuantity) {
    this.stockInQuantity = qty;
  }

  if (!this.originalQuantity) {
    this.originalQuantity = qty;
  }

});

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


StockSchema.index({ category: 1 });

module.exports = mongoose.model("Stock", StockSchema);