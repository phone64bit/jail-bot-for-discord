const mongoose = require('mongoose');

let premiumSchema = new mongoose.Schema({
    GuildID: {
        type: String,
        required: true
    },
    Expire: {
        type: Number,
        required: true
    }
}, {versionKey: false});

module.exports = mongoose.model('premium', premiumSchema);