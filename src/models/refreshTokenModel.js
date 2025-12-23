const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    createdByIp: {
        type: String,
    },
    revokedAt: {
        type: Date,
    },
    revokedByIp: {
        type: String,
    },
    replacedByToken: {
        type: String,
    },
}, {
    timestamps: true,
});

// Indexes for query performance (token already indexed by unique)
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 });

// Virtual property to check if token is expired
refreshTokenSchema.virtual('isExpired').get(function() {
    return Date.now() >= this.expiresAt;
});

// Virtual property to check if token is active
refreshTokenSchema.virtual('isActive').get(function() {
    return !this.revokedAt && !this.isExpired;
});

// Method to revoke token
refreshTokenSchema.methods.revoke = function(ipAddress, replacedByToken) {
    this.revokedAt = Date.now();
    this.revokedByIp = ipAddress;
    if (replacedByToken) {
        this.replacedByToken = replacedByToken;
    }
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
module.exports = RefreshToken;
