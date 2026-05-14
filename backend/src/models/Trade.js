const mongoose = require("mongoose");

const schema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },

        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workspace",
            index: true,
        },

        csvFileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CsvFile",
        },

        exchangeName: String,

        pair: {
            type: String,
            index: true,
        },

        side: {
            type: String,
            enum: ["BUY", "SELL"],
            index: true,
        },

        quantity: String,
        price: String,

        fee: String,
        fees: String,

        tds: String,

        // IMPORTANT:
        // CSV me agar Tax / Total Tax / Direct Tax column ho,
        // to yahi value database me save hogi.
        tax: String,
        totalTax: String,
        totalDirectTax: String,

        status: String,
        orderValue: String,

        executedAt: {
            type: Date,
            index: true,
        },

        raw: Object,

        isManual: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Trade", schema);