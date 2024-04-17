const mongoose = require('mongoose');

let setPrefixSchema = new mongoose.Schema({
    Prefix: {
        type: String,
        required: true
    },
    GuildID: {
        type: String,
        required: true
    }
}, {versionKey: false});

module.exports = mongoose.model('prefix', setPrefixSchema);