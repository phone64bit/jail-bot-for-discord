const mongoose = require('mongoose');

var newJailRolesFunctionSchema = new mongoose.Schema({
    GuildID: {
        type: String,
        required: true
    }
}, {versionKey: false});

module.exports = mongoose.model('settings-jailRoles', newJailRolesFunctionSchema);