const mongoose = require("mongoose");

const StockSchema = new mongoose.Schema({
  itemName: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    trim: true,
  },
  supplier: {
    type: String,
    trim: true,
  },
  unitCost: {
    type: Number,
    trim: true,
  },
  unitPrice: {
    type: Number,
    trim: true,
    required:true,
  validate:{
    validator:function(value){
      return value > this.unitCost;
    },
    message:'unitPrice must be greater than unitCost'
  }

  },
  amountPaid: {
    type: Number,
    trim: true,
  },
  paymentMethod: {
    type: String,
    trim: true,
  },
  total:{
    type:Number,
  },
  
});

module.exports = mongoose.model("Stock", StockSchema);
