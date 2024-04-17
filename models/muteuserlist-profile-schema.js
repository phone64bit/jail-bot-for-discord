const mongoose = require('mongoose');

const muteuserlistSchema = new mongoose.Schema({
    UserID: {
        type: String,
        required: true
    },
    GuildID: {
        type: String,
        required: true
    },
    muteTime: {
        type: String
    }
}, {versionKey: false});

module.exports = mongoose.model('muteuser', muteuserlistSchema);