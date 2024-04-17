const mongoose = require('mongoose');

const jailAdminSchema = new mongoose.Schema({
    GuildID: {
        type: String,
        required: true
    }
}, {versionKey: false});

module.exports = mongoose.model('settings-jailAdmin', jailAdminSchema);