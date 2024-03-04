const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const AdsSchema = new mongoose.Schema(
  {
    adname: { type: String },
    status: { type: String, default: "review" },
    engagementrate: { type: String },
    amountspent: [{ type: String }],
    advertiserid: { type: String },
    startdate: { type: String },
    enddate: { type: String },
    goal: { type: String },
    category: { type: String },
    cta: { type: String },
    ctalink: { type: String },
    totalspent: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    stopreason: { type: String },
    // content: [{ extension: { type: String }, name: { type: String } }],
    post: [
      {
        content: { type: String },
        type: { type: String },
        size: { type: String },
        thumbnail: { type: String },
      },
    ],
    adsDetails: [
      {
        time: { type: Date, default: Date.now },
        click: { type: Number, default: 0 },
        impressions: { type: Number, default: 0 },
        cpc: { type: Number, default: 0 },
        cost: { type: Number, default: 0 },
      },
    ],
    type: { type: String },
    tags: [{ type: String }],
    location: [{ type: String }],
    gender: { type: String },
    agerange: { type: String },
    maxage: { type: Number },
    minage: { type: Number },
    totalbudget: { type: Number },
    dailybudget: { type: Number },
    audiencesize: { type: Number },
    category: { type: String },
    transactions: [{ type: ObjectId, ref: "AdTransactions" }],
    adid: { type: String, required: true },
    userid: { type: ObjectId, ref: "User" },
    postid: { type: ObjectId, ref: "Post" },
    editcount: [
      {
        date: { type: String, default: Date.now().toString() },
        number: { type: String, default: 0 },
      },
    ],
    creation: { type: Number },
    type: { type: String },
    headline: { type: String },
    desc: { type: String },
  },
  { timestamps: false }
);

AdsSchema.index({ title: "text" });

module.exports = mongoose.model("Ads", AdsSchema);
