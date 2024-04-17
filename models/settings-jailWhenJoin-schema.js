const mongoose = require('mongoose');

let JailWhenJoinSchema = new mongoose.Schema({
    guildID: {
        type: String,
        required: true
    },
    jailNotification: {
        type: Boolean,
        required: true,
    },
    jailTime: {
        type: String
    },
    prisonChannelID: {
        type: String,
        required: true,
    }
}, {versionKey: false});

module.exports = mongoose.model('settings-JailWhenJoin', JailWhenJoinSchema);