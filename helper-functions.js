const	mongoClient = require(`./mongoClient`),
		fs = require(`fs`);


module.exports = {
	
	lowercaseUsername: (req, res, next) => {
		req.body.username = req.body.username.toLowerCase().trim();
		req.body.password = req.body[`password`].trim();
		next();
	},
	
	getUserPermissions: (userID, callback) => {
		mongoClient.get().db(process.env.MONGO_AUTH_DATABASE).collection(`permissions`).findOne( {_id: require(`mongodb`).ObjectID(userID) }, (err, userDocument) => {
			assert.equal(null, err);
			callback(userDocument);
		});
	}
	
};