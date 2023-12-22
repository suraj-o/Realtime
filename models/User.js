const mongoose = require("mongoose");
const crypto = require("crypto");
const { ObjectId } = mongoose.Schema;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      trim: true,
      maxLength: 50,
    },
    hashed_password: {
      type: String,
    },
    passw: { type: String },
    otp: { type: String },
    salt: String,
    role: {
      type: String,
      default: "User",
    },
    resetPasswordLink: {
      data: String,
    },
    fullname: {
      type: String,
      maxLength: 30,
    },
    token: { type: String },
    phone: { type: String, trim: true },
    DOB: { type: String },
    username: {
      type: String,
      maxLength: 30,
      trim: true,
      unique: true,
    },
    profilepic: {
      type: String,
    },
    prositepic: { type: String },
    links: { type: [String] },
    linkstype: { type: [String] },
    interest: {
      type: [String],
      default: [],
    },
    puchase_history: [{ type: ObjectId, ref: "Order", required: true }],
    subscriptions: [{ type: ObjectId, ref: "Subscriptions" }],
    cart_history: {
      type: [String],
      default: [],
    },
    notifications: {
      type: [String],
    },
    location: { type: String },
    isverified: {
      type: Boolean,
      default: false,
    },
    settings: {
      type: [String],
    },
    status: {
      type: String,
      default: "Unblock",
      enum: ["Unblock", "Block"],
    },
    desc: { type: String, maxLength: 500 },
    shortdesc: { type: String, maxLength: 150 },
    communityjoined: [{ type: ObjectId, ref: "Community", default: [] }],
    totalcom: { type: Number, default: 0 },
    likedposts: [{ type: ObjectId, ref: "Post", default: [] }],
    topicsjoined: [{ type: ObjectId, ref: "Topic", default: [] }],
    totaltopics: { type: Number, default: 0 },
    notifications: [{ type: ObjectId, ref: "Notification" }],
    notificationscount: { type: Number, default: 0 },
    purchasestotal: { type: Number, default: 0 },
    storeAddress: { type: String, default: null },
    address: { type: String, default: null },
    gender: {
      type: "String",
    },
    location: { type: String },
    ipaddress: { type: String },
    currentlogin: { type: String },
    popularity: { type: String, default: "0%" },
    totalmembers: { type: Number, default: 0 },
    badgescount: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    currentmoney: { type: Number, default: 0 },
    paymenthistory: [{ type: ObjectId, ref: "Payment" }],
    revenue: { type: Number, default: 0 },
    cart: [{ type: ObjectId, ref: "Cart" }],

    web: { type: String },
    prositeid: { type: ObjectId, ref: "Prosite" },
    lastlogin: { type: [String] },
    location: { type: [String] },
    device: { type: [String] },
    accounttype: { type: String },
    organization: { type: String },
    contacts: [{ type: Array }],
    notificationtoken: { type: String },
    sessions: [
      {
        time: { type: String, default: Date.now().toString() },
        screen: { type: String },
        deviceinfo: { type: [Array] },
        location: { type: [Array] },
      },
    ],
    activity: [
      {
        time: { type: String, default: Date.now().toString() },
        type: { type: String },
        deviceinfo: { type: [Array] },
        location: { type: [Array] },
      },
    ],
    blockedcoms: [
      {
        time: { type: String, default: Date.now().toString() },
        comId: { type: ObjectId, ref: "Community" },
      },
    ],
    blockedpeople: [
      {
        time: { type: String, default: Date.now().toString() },
        id: { type: ObjectId, ref: "User" },
      },
    ],
    messagerequests: [
      {
        message: { type: String },
        id: { type: ObjectId, ref: "User" },
      },
    ],
    msgrequestsent: [
      {
        id: { type: ObjectId, ref: "User" },
      },
    ],
    conversations: [
      {
        type: String,
        timestamp: new Date(),
      },
    ],
    mesIds: [{ type: Number }],
  },
  { timestamps: true }
);

userSchema.index({ fullname: "text" });

//virtualfields

userSchema
  .virtual("password")
  .set(function (password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashed_password = this.encryptPassword(password);
  })
  .get(function () {
    return this._password;
  });

//virtual methods

userSchema.methods = {
  authenticate: function (plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  },

  encryptPassword: function (password) {
    if (!password) return "";
    try {
      return crypto
        .createHmac("sha1", this.salt)
        .update(password)
        .digest("hex");
    } catch (err) {
      return "";
    }
  },
  makeSalt: function () {
    return Math.round(new Date().valueOf() * Math.random()) + "";
  },
};

module.exports = mongoose.model("User", userSchema);
