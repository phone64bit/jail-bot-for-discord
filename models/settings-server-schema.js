const mongoose = require('mongoose');

const serverSettingsSchema = new mongoose.Schema({
    guildID: {
        type: String,
        required: true
    },
    policeRolesID: {
        type: Array,
    },
    prisonCategoryID: {
        type: String,
    }
}, {versionKey: false});

module.exports = mongoose.model('settings-server', serverSettingsSchema);