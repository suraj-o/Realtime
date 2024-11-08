const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const prositeAnalytics = new mongoose.Schema({
  userId: { type: ObjectId, ref: "User" },
  visitors: [
    {
      id: {
        type: ObjectId,
        ref: "User",
      },
      visitDate: { type: Date, default: Date.now },
    },
  ],
  totalVisitors: [
    {
      visitors: { type: Number, default: 0 },
      date: { type: Date, default: Date.now },
    },
  ],
  totalTimeSpent: { type: Number, default: 0 },
  numberOfSessions: { type: Number, default: 0 },
  demographics: {
    age: {
      "0-14": {
        type: Number,
        default: 0,
      },
      "15-28": {
        type: Number,
        default: 0,
      },
      "29-42": {
        type: Number,
        default: 0,
      },
      "43-65": {
        type: Number,
        default: 0,
      },
      "65+": {
        type: Number,
        default: 0,
      },
    },
    gender: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 },
    },
  },
  location: {
    "Andaman & Nicobar Islands": { type: Number, default: 0 },
    "Andhra Pradesh": { type: Number, default: 0 },
    "Arunachal Pradesh": { type: Number, default: 0 },
    Assam: { type: Number, default: 0 },
    Bihar: { type: Number, default: 0 },
    Chhattisgarh: { type: Number, default: 0 },
    Chandigarh: { type: Number, default: 0 },
    "Dadra & Nagar Haveli And Daman DIU": { type: Number, default: 0 },
    "Daman & Diu": { type: Number, default: 0 },
    Delhi: { type: Number, default: 0 },
    Goa: { type: Number, default: 0 },
    Gujarat: { type: Number, default: 0 },
    Haryana: { type: Number, default: 0 },
    "Himachal Pradesh": { type: Number, default: 0 },
    "Jammu & Kashmir": { type: Number, default: 0 },
    Jharkhand: { type: Number, default: 0 },
    Karnataka: { type: Number, default: 0 },
    Kerala: { type: Number, default: 0 },
    Lakshadweep: { type: Number, default: 0 },
    "Madhya Pradesh": { type: Number, default: 0 },
    Maharashtra: { type: Number, default: 0 },
    Manipur: { type: Number, default: 0 },
    Meghalaya: { type: Number, default: 0 },
    Mizoram: { type: Number, default: 0 },
    Nagaland: { type: Number, default: 0 },
    Odisha: { type: Number, default: 0 },
    Puducherry: { type: Number, default: 0 },
    Punjab: { type: Number, default: 0 },
    Rajasthan: { type: Number, default: 0 },
    Sikkim: { type: Number, default: 0 },
    "Tamil Nadu": { type: Number, default: 0 },
    Telangana: { type: Number, default: 0 },
    Tripura: { type: Number, default: 0 },
    "Uttar Pradesh": { type: Number, default: 0 },
    Uttarakhand: { type: Number, default: 0 },
    "West Bengal": { type: Number, default: 0 },
  },
});

module.exports = mongoose.model("PrositeAnalytics", prositeAnalytics);
