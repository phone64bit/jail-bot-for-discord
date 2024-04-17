const mongoose = require('mongoose');

var PremiumCodeSchema = new mongoose.Schema({
    CodeID: {
        type: String,
        required: true
    },
    days: {
        type: String,
        required: true
    },
    isUse: {
        type: Boolean,
        required: true
    },
    ifUseTrueTime: {
        type: String,
    },
    ifUseTrueUserID: {
        type: String,
    },
    ifUseTrueUserTag: {
        type: String
    },
    ifUseTrueGuildID: {
        type: String
    },
}, {versionKey: false})

module.exports = mongoose.model("premium-code", PremiumCodeSchema)