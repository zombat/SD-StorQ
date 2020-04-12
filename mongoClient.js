require(`dotenv`).config();
const	assert = require(`assert`),
		mongoClient = require(`mongodb`).MongoClient;

var mongoDB;

function connect(callback){
	if(process.env.MONGO_USER != `` && process.env.MONGO_PASSWORD != ``){
		 var mongoURL = process.env.MONGO_URL.replace(/<username>/, process.env.MONGO_USER);
		 mongoURL = mongoURL.replace(/<password>/, process.env.MONGO_PASSWORD);
	} else {
		 var mongoURL = process.env.MONGO_URL.replace(/<username>/, ``);
		 mongoURL = mongoURL.replace(/:<password>@/, ``);
	}
    mongoClient.connect(mongoURL, { 'useNewUrlParser': true, 'useUnifiedTopology': true }, (err, db) => {
        mongoDB = db;
        callback();
    });
}
function get(){
    return mongoDB;
}

function close(){
    mongoDB.close();
}

module.exports = {
    connect,
    get,
    close
};