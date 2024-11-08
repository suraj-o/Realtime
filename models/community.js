const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const communitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    creator: { type: ObjectId, ref: "User", required: true },
    popularity: { type: Number },
    category: { type: String, required: true },
    dp: { type: String, required: true },
    members: [
      {
        type: ObjectId,
        ref: "User",
        //  required: true
      },
    ],
    memberscount: { type: Number, default: 0 },
    posts: [
      {
        type: ObjectId,
        ref: "Post",
        //  required: true
      },
    ],
    totalposts: { type: Number, default: 0 },
    tags: { type: [String] },
    desc: { type: String },
    preview: { type: [String] },
    topics: [{ type: ObjectId, ref: "Topic" }],
    totaltopics: { type: Number, default: 2 },
    type: { type: String, default: "public" },
    isverified: { type: Boolean, default: false },
    status: {
      type: String,
      default: "Unblock",
      enum: ["Unblock", "Block"],
    },
    blocked: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
    moderators: [
      {
        type: ObjectId,
        ref: "User",
        // required: true
      },
    ],
    notifications: [
      {
        id: { type: ObjectId, ref: "User" },
        muted: { type: Boolean, default: false },
      },
    ],
    admins: [
      {
        type: ObjectId,
        ref: "User",
        //  required: true
      },
    ],
    // stats: {
    //   X: [{ type: String }], //days(x-axis)
    //   Y1: [{ type: String }], //members
    //   Y2: [{ type: String }], //visitors
    // },
    stats: [
      {
        X: { type: String }, //date
        Y1: { type: Number }, //members
        Y2: { type: Number }, //vistors
      },
    ],
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
      "Assam": { type: Number, default: 0 },
      "Bihar": { type: Number, default: 0 },
      "Chhattisgarh": { type: Number, default: 0 },
      "Chandigarh": { type: Number, default: 0 },
      "Dadra & Nagar Haveli And Daman DIU": { type: Number, default: 0 },
      "Daman & Diu": { type: Number, default: 0 },
      "Delhi": { type: Number, default: 0 },
      "Goa": { type: Number, default: 0 },
      "Gujarat": { type: Number, default: 0 },
      "Haryana": { type: Number, default: 0 },
      "Himachal Pradesh": { type: Number, default: 0 },
      "Jammu & Kashmir": { type: Number, default: 0 },
      "Jharkhand": { type: Number, default: 0 },
      "Karnataka": { type: Number, default: 0 },
      "Kerala": { type: Number, default: 0 },
      "Lakshadweep": { type: Number, default: 0 },
      "Madhya Pradesh": { type: Number, default: 0 },
      "Maharashtra": { type: Number, default: 0 },
      "Manipur": { type: Number, default: 0 },
      "Meghalaya": { type: Number, default: 0 },
      "Mizoram": { type: Number, default: 0 },
      "Nagaland": { type: Number, default: 0 },
      "Odisha": { type: Number, default: 0 },
      "Puducherry": { type: Number, default: 0 },
      "Punjab": { type: Number, default: 0 },
      "Rajasthan": { type: Number, default: 0 },
      "Sikkim": { type: Number, default: 0 },
      "Tamil Nadu": { type: Number, default: 0 },
      "Telangana": { type: Number, default: 0 },
      "Tripura": { type: Number, default: 0 },
      "Uttar Pradesh": { type: Number, default: 0 },
      "Uttarakhand": { type: Number, default: 0 },
      "West Bengal": { type: Number, default: 0 }
    },
    newmemberscount: { type: Number, default: 0 },
    newmembers: [{ type: ObjectId, ref: "User" }],
    paidmemberscount: { type: Number, default: 0 },
    visitors: { type: Number, default: 0 },
    returningvisitor: { type: Number, default: 0 },
    newvisitor: { type: Number, default: 0 },
    activemembers: [{ type: ObjectId, ref: "User" }],
    uniquemembers: [{ type: ObjectId, ref: "User" }],
    ismonetized: { type: Boolean, default: false },
    impressions: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 }, //Earnings from Clicks
    cpm: { type: Number, default: 0 }, //Earnings from Views
  },
  { timestamps: false, strict: false }
);

communitySchema.index({ title: "text" });

module.exports = mongoose.model("Community", communitySchema);
