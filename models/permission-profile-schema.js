const mongoose = require('mongoose');

let permissionSchema = new mongoose.Schema({
    UserID: {
        type: String,
        required: true
    },
    permissionLevel: {
        type: Number,
        required: true
    }
}, {versionKey: false});

module.exports = mongoose.model('permission', permissionSchema);