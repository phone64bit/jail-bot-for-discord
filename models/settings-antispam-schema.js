const mongoose = require('mongoose');

var AntiSpamSchema = new mongoose.Schema({
    GuildID: {
        type: String,
        required: true
    },
    jailTime: {
        type: String
    },
    warnmessage: {
        type: String
    }
}, {versionKey: false});

module.exports = mongoose.model('settings-antispam', AntiSpamSchema);