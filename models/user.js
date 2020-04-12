const	mongoose = require(`mongoose`),
		passportLocalMongoose = require(`passport-local-mongoose`);

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: String,
    secret_key: {
        secret: String,
        authenticated: {
            type: Boolean,
            default: false
        }
    },
    tfa:{
        type: Boolean,
        default: false
    }
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model(`User`, userSchema);