const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Instance method — compare plain password against hash
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Static method — create user with hashed password
userSchema.statics.createWithPassword = async function (email, plain) {
  const hash = await bcrypt.hash(plain, 12);
  return this.create({ email, passwordHash: hash });
};

module.exports = mongoose.model('User', userSchema);
