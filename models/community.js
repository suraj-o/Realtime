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
        "18-24": { type: Number, default: 0 },
        "25-34": { type: Number, default: 0 },
        "35-44": { type: Number, default: 0 },
        "45-64": { type: Number, default: 0 },
        "65+": { type: Number, default: 0 },
      },
      gender: {
        male: { type: Number, default: 0 },
        female: { type: Number, default: 0 },
      },
    },
    location: {
      "andhra pradesh": { type: Number, default: 0 },
      "arunachal pradesh": { type: Number, default: 0 },
      assam: { type: Number, default: 0 },
      bihar: { type: Number, default: 0 },
      chhattisgarh: { type: Number, default: 0 },
      goa: { type: Number, default: 0 },
      gujarat: { type: Number, default: 0 },
      haryana: { type: Number, default: 0 },
      "himachal pradesh": { type: Number, default: 0 },
      jharkhand: { type: Number, default: 0 },
      karnataka: { type: Number, default: 0 },
      kerala: { type: Number, default: 0 },
      "madhya pradesh": { type: Number, default: 0 },
      maharashtra: { type: Number, default: 0 },
      manipur: { type: Number, default: 0 },
      meghalaya: { type: Number, default: 0 },
      mizoram: { type: Number, default: 0 },
      nagaland: { type: Number, default: 0 },
      odisha: { type: Number, default: 0 },
      punjab: { type: Number, default: 0 },
      rajasthan: { type: Number, default: 0 },
      sikkim: { type: Number, default: 0 },
      "tamil nadu": { type: Number, default: 0 },
      telangana: { type: Number, default: 0 },
      tripura: { type: Number, default: 0 },
      "uttar pradesh": { type: Number, default: 0 },
      uttarakhand: { type: Number, default: 0 },
      "west bengal": { type: Number, default: 0 },
    },
    visitors: { type: Number, default: 0 },
    newmemberscount: { type: Number, default: 0 },
    newmembers: [{ type: ObjectId, ref: "User" }],
    paidmemberscount: { type: Number, default: 0 },
    ismonetized: { type: Boolean, default: false },
  },
  { timestamps: false, strict: false }
);

communitySchema.index({ title: "text" });

module.exports = mongoose.model("Community", communitySchema);
