const mongoose = require('mongoose');

let blacklistSchema = new mongoose.Schema({
    UserID: {
        type: String,
        required: true
    },
    ExecuteID: {
        type: String,
        required: true
    }
}, {versionKey: false});

module.exports = mongoose.model('blacklist', blacklistSchema);