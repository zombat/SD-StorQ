require(`dotenv`).config();
const	express = require(`express`),
		mongoose = require(`mongoose`),
		app = express(),
		fs = require(`fs`),
		assert = require(`assert`),
		bodyParser = require(`body-parser`),
		routes  = require(`./routes/index`),
		ajax = require(`./routes/ajax/index`),
		tfa = require(`./routes/tfa`),
		expressSession = require(`express-session`),
		passport = require(`passport`),
		mongoClient = require(`./mongoClient`),	
		DATABASE_URL = process.env.DATABASE_URL;

if(process.env.SERVER_MODE == `HTTP`){
	var http = require(`http`).createServer(app);
	global.io = require(`socket.io`)(http);
} else {
	var https = require(`https`);
	global.io = require(`socket.io`)(https);
}

// Configure app
app.set(`view engine`, `ejs`);
app.set(`socketio`, io);


// middlewares
app.use(express.static(__dirname + `/public`));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Configure passport
app.use((expressSession)({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());



// configure mongoose and DB connection
mongoose.Promise = global.Promise;
mongoose.set(`useNewUrlParser`, true);
mongoose.set(`useFindAndModify`, false);
mongoose.set(`useCreateIndex`, true);
mongoose.set(`useUnifiedTopology`, true);
if(process.env.MONGOOSE_USER != `` && process.env.MONGOOSE_PASSWORD != ``){
		 var mongoooseURL = process.env.MONGOOSE_URL.replace(/<username>/, process.env.MONGOOSE_USER);
		 mongoooseURL = mongoURL.replace(/<password>/, process.env.MONGOOSE_PASSWORD);
	} else {
		 var mongoooseURL = process.env.MONGOOSE_URL.replace(/<username>/, ``);
		 mongoooseURL = mongoooseURL.replace(/:<password>@/, ``);
	}

mongoose.connect(mongoooseURL).then((db =>{
	mongoClient.connect(() => {
		mongoClient.get().db(`queue`).collection(`twilio`).createIndex( { 'smsreceivedtime': 1 }, { 'expireAfterSeconds': parseInt(process.env.SMS_CHECKIN_TIMER)  }, (err, response) =>{
			assert.equal(null, err);
		});
		
		if(process.env.SERVER_MODE == `HTTP`){
			http.listen(process.env.HTTP_PORT, ()=>{
				console.log(`HTTP listenning on ` + process.env.HTTP_PORT);
			});
		} else {
			https.createServer({
				key: fs.readFileSync(`./domain-key.txt`),
				cert: fs.readFileSync(`./domain-crt.txt`)
			}, app).listen(process.env.HTTPS_PORT, () => {
			 console.log(`HTTPS listening on ` + process.env.HTTPS_PORT)
			});
		}	
	});
})).catch(dbErr =>{
    console.log(`Connection Error : `, dbErr.message);
    process.exit(1);
});

app.use(routes);
app.use(ajax);
app.use(tfa);
