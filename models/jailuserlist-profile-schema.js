const mongoose = require("mongoose");

const jailuserlistSchema = new mongoose.Schema({
    UserID: {
        type: String,
        required: true
    },
    GuildID: {
        type: String,
        required: true
    },
    UserRoles: {
        type: mongoose.Schema.Types.Array
    },
    jailTime: {
        type: String
    },
    jailNoti: {
        type: Boolean,
    },
    reason: {
        type: String,
        required: true,
    },
}, {versionKey: false})

module.exports = mongoose.model("jailuserlist", jailuserlistSchema);