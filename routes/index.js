const	express = require(`express`),
		router = express.Router(),
		User = require(`../models/user`),
		middlewares = require(`../middlewares/index`),
		passportLocal = require(`../auth/local`),
		helperFunctions = require(`../helper-functions`),
		assert = require(`assert`),
		mongoClient = require(`../mongoClient`),
		twilioClient = require(`twilio`)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, { 
			lazyLoading: true 
		}),
		MessagingResponse = require(`twilio`).twiml.MessagingResponse,
		MaxCapacity = process.env.MAX_CAPACITY;
		
var		WaitTotal = 0;
var		EstimatedWaitTime = 0;
var		MaxPartySize = 3;

if(process.env.TWILIO_PHONE_NUMBER.length && process.env.TWILIO_AUTH_TOKEN.length && process.env.TWILIO_ACCOUNT_SID.length ){
	var EnableTwilio = true;
} else {
	var EnableTwilio = false;	
}
	console.log(EnableTwilio);
router.post(`/sms`,(req, res)=>{
	console.log(EnableTwilio);
	if(EnableTwilio){
		console.log(`SMS received`);
		const twiml = new MessagingResponse();
		mongoClient.get().db(`queue`).collection(`queue`).find({ 'phonenumber' : req.body.From.substring(1, req.body.From.length)}).count( (err, count)=>{ 
			console.log(`Document Count: ` + count);
			assert.equal(null, err);
			if(count == 0){
				console.log(`Not in queue already`);
				mongoClient.get().db(`queue`).collection(`twilio`).findOne({ '_id' : req.body.From }, (err, document)=>{
					assert.equal(null, err);
					if(document == null){
						console.log(`Creating new workflow`);
						var newDocument = {
							'_id': req.body.From,
							'phonenumber' : req.body.From.substring(1, req.body.From.length),
							'step': 1,
							'smsreceivedtime': new Date()
						};
						mongoClient.get().db(`queue`).collection(`twilio`).insertOne( newDocument, (err, response)=>{
							assert.equal(null, err);
							twiml.message(`The current average wait time has been: ` + EstimatedWaitTime.toString() + ` minutes. Do you want to get in line? (respond yes or no)`);
							res.writeHead(200, {'Content-Type': 'text/xml'});
							res.end(twiml.toString());
						});
					} else if(document.step == 1 && req.body.Body.match(/yes/i)){
						mongoClient.get().db(`queue`).collection(`twilio`).updateOne({ '_id': req.body.From },{ '$set': { 'registerby': `Twilio`, 'step': 2 } }, (err, response)=>{
							assert.equal(null, err);
							twiml.message(`What is your name?`);
							res.writeHead(200, {'Content-Type': 'text/xml'});
							res.end(twiml.toString());
						});
					} else if(document.step == 2){
						mongoClient.get().db(`queue`).collection(`twilio`).updateOne({ '_id': req.body.From },{ '$set': { 'name': req.body.Body, 'step': 3  } }, (err, response)=>{
							assert.equal(null, err);
							twiml.message(`How many people (including childern) are in your group? (respond 1 through 3)`);
							res.writeHead(200, {'Content-Type': 'text/xml'});
							res.end(twiml.toString());
						});
					} else if(document.step == 3 && req.body.Body.match(/1|2|3/)){ 
						document.partysize = parseInt(req.body.Body.match(/1|2|3/));
						document.manualregister = false;
						document.status = `waiting`;
						document.timeregistered = new Date().toISOString();
						delete document._id;
						delete document.step;
						mongoClient.get().db(`queue`).collection(`queue`).insertOne( document, (err, response)=>{
							assert.equal(null, err);
							updateWaitList();
							mongoClient.get().db(`queue`).collection(`twilio`).deleteOne({ '_id': req.body.From }, (err, response)=>{
								assert.equal(null, err);
								mongoClient.get().db(`queue`).collection(`queue`).find({},{ '_id' : 0, 'phonenumber': 1 }).toArray((err, documents)=>{
									assert.equal(null, err);
									console.log(documents);
									var Position = 0;
									for(var i=0;i<documents.length;i++){
										if(documents[i].hasOwnProperty(`phonenumber`)){
											if(documents[i].phonenumber == req.body.From.substring(1, req.body.From.length)){
												Position = i+1;
											}
										}
									}
									twiml.message(`You are position ` + Position + ` in line. Please wait in your vehicle until you are notified to enter. You will have five minutes to check in after receving your notification message.`);
									res.writeHead(200, {'Content-Type': 'text/xml'});
									res.end(twiml.toString());
								});
								
								
							});
						});
					} else if(document.step == 3){
						twiml.message(`How many people (including childern) are in your group? (respond 1 through 3)`);
						res.writeHead(200, {'Content-Type': 'text/xml'});
						res.end(twiml.toString());				
					}
				});
			} else {
				console.log(`In queue already`);
				twiml.message(`You are already in line. The current average wait time has been: ` + EstimatedWaitTime + `minutes`);
				res.writeHead(200, {'Content-Type': 'text/xml'});
				res.end(twiml.toString());
			}
		});	
	}
});


// rendering signin page
router.get(`/`, (req, res)=>{
    res.redirect(`/login`);
});



// rendering the dashboard
router.get(`/dashboard`, middlewares.isLoggedIn, middlewares.ensureTfa, (req, res)=>{
    User.findById(req.user.id).then((rUser)=>{
        if(!rUser){
            return res.redirect(`/login`);
        }
        let isChecked = rUser.tfa;
        res.render(`dashboard`, {username: rUser.username, isChecked});
    })
});

// rendering the queue list
router.get(`/queue`, middlewares.isLoggedIn, middlewares.ensureTfa, (req, res)=>{
    User.findById(req.user.id).then((rUser)=>{
        if(!rUser){
            return res.redirect(`/login`);
        }
        let isChecked = rUser.tfa;
		mongoClient.get().db(`history`).collection(todaysDate()).find().toArray( (err, HistoryList)=>{
			assert.equal(null, err);
			mongoClient.get().db(`queue`).collection(`queue`).find().toArray( (err, WaitList)=>{
				assert.equal(null, err);
				var WaitTotal = 0;
					WaitList.forEach((entry)=>{
						WaitTotal += entry.partysize;
					});
				mongoClient.get().db(`queue`).collection(`active`).find().toArray( (err, OccupantList)=>{
					assert.equal(null, err);
					var OccupantTotal = 0;
					OccupantList.forEach((entry)=>{
						OccupantTotal += entry.partysize;
					});
					res.render(`queue-view`, {username: rUser.username, isChecked, WaitList, OccupantList, HistoryList, OccupantTotal, WaitTotal});
				});
			});
		});
	});
});


router.post(`/api`, middlewares.isLoggedIn, middlewares.ensureTfa, (req, res)=>{ 
    if(1 == 1){
		if(req.body.direction == `in`){
			mongoClient.get().db(`queue`).collection(`queue`).findOne({ _id: require(`mongodb`).ObjectID(req.body.id) },(err, document)=>{
				assert.equal(null, err);
				if(document != null){
					document.status = `in-building`;
					document.entrytime = new Date().toISOString();
					mongoClient.get().db(`queue`).collection(`active`).insertOne( document, (err, response)=>{
						assert.equal(null, err);
						updateOccupantList();
						mongoClient.get().db(`queue`).collection(`queue`).deleteOne({ _id: require(`mongodb`).ObjectID(req.body.id) }, (err, response)=>{
							assert.equal(null, err);
							updateWaitList();
						});
					});
				} else {
					updateWaitList();
					updateOccupantList();
				}
			});
			res.status(200);
			res.json({});
		} else if(req.body.direction == `out`){
			mongoClient.get().db(`queue`).collection(`active`).findOne({ _id: require(`mongodb`).ObjectID(req.body.id) },(err, document)=>{
				assert.equal(null, err);
				if(document != null && document.hasOwnProperty(`status`)){
					document.status = `complete`;
					document.exittime = new Date().toISOString();
					mongoClient.get().db(`history`).collection(todaysDate()).insertOne( document, (err, response)=>{
						assert.equal(null, err);
						mongoClient.get().db(`queue`).collection(`active`).deleteOne({ _id: require(`mongodb`).ObjectID(req.body.id) }, (err, response)=>{
							assert.equal(null, err);
							updateOccupantList();
							updateHistory();
							res.status(200);
							res.json({});
							});
					});
				} else {
					updateHistory();
					updateOccupantList();
				}
			});
		} else if(req.body.direction == `manual-registration`){ 
			var document = {
				'name' : req.body.name,
				'phonenumber' : req.body.phonenumber,
				'partysize' : parseInt(req.body.partysize),
				'manualregister' : true,
				'registerby' : req.user.id,
				'status' : 'waiting',
				'timeregistered': new Date().toISOString()
			};
			mongoClient.get().db(`queue`).collection(`queue`).insertOne( document, (err, response)=>{
				assert.equal(null, err);
				updateWaitList();
			});
			res.status(200);
			res.json({});
		}

	}
	else {
		res.status(403);
		res.json({'message': 'Forbidden'});
	}
});

if(process.env.ENABLE_REGISTRATION == `true`){
	// rendering registration page
	router.get(`/register`, (req, res)=>{
		res.render(`register`);
	});

	// handling registration
	router.post(`/register`, (req, res)=>{
		const user = {username: req.body.username};
		User.register(user, req.body.password, (err, rUser)=>{
			if(err){
				console.log(err);
				res.render(`register`);
			}
			passportLocal.authenticate(`local`)(req, res, ()=>{
				res.redirect(`/queue`);
			});
		});
	});
}


// rendering the login page
router.get(`/login`, (req, res)=>{
    if(req.user){
        return res.redirect(`/queue`);
    }
    res.render(`login`, { 'EnableRegistration' : process.env.ENABLE_REGISTRATION } );
});

// handling login
router.post(`/login`, helperFunctions.lowercaseUsername, passportLocal.authenticate(`local`, {
    //successReturnToOrRedirect: `/queue`,
    failureRedirect: `/login`
}), (req, res, next)=>{
    User.findById(req.user._id).then((rUser)=>{
        next();
    });
    
}, middlewares.isTfa, (req, res)=>{
    res.redirect(`/dashboard`);
});

// logging out
router.get(`/logout`, middlewares.isLoggedIn, (req, res)=>{
    User.findById(req.user._id).then((rUser)=>{
        rUser.secret_key.authenticated = false;
        rUser.save();
        req.logOut();
        res.redirect("/");
    });
});

function intervalFunction(){
	var ExpirationTime = process.env.EXPIRATION_MINUTES * 60000;
	var NotifiedTotal = 0;
	var OccupantTotal = 0;
	var RemainingCapacity = 0;
	
	// Notify party if they can fit in the building
	mongoClient.get().db(`queue`).collection(`queue`).find({'status': 'notified'},{'_id': 0, 'partysize': 1}).toArray( (err, NotifiedList)=>{
		assert.equal(null, err);
		NotifiedList.forEach((entry)=>{
			NotifiedTotal += entry.partysize;
		});
		console.log(`Notified Total: ` + NotifiedTotal);
		mongoClient.get().db(`queue`).collection(`active`).find({ },{'_id': 0, 'partysize': 1}).toArray( (err, OccupantList)=>{
			assert.equal(null, err);
			OccupantList.forEach((entry)=>{
				OccupantTotal += entry.partysize;
			});
			console.log(`Occupant Total: ` + OccupantTotal);
			RemainingCapacity = MaxCapacity-(OccupantTotal+NotifiedTotal);
			console.log(`Remaining Capacity: ` + RemainingCapacity);
			mongoClient.get().db(`queue`).collection(`queue`).findOne({ 'status': 'waiting', 'partysize': { '$ne': NaN }},(err, WaitingParty)=>{
				assert.equal(null, err);
				if(WaitingParty !=null){
					if(WaitingParty.partysize <= RemainingCapacity){
						notifyParty(WaitingParty, WaitingParty.phonenumber, (response)=> {
							
						});
					}
				}
			});
		});
	});
	// Archive bad entries
	mongoClient.get().db(`queue`).collection(`queue`).find({'partysize': NaN },{'_id': 0, 'partysize': 1}).toArray( (err, BadEntries)=>{ 
		assert.equal(null, err);
		BadEntries.forEach((entry)=>{
			entry.status = `invalid`;
			mongoClient.get().db(`history`).collection(todaysDate()).insertOne(entry, (err, response)=>{
				assert.equal(null, err);
				mongoClient.get().db(`queue`).collection(`queue`).deleteOne({ _id: entry._id }, (err, response)=>{
						assert.equal(null, err);
					});
			});
		});
	});
	
	// Archive notified parties in excess of the allowed time in minutes
	mongoClient.get().db(`queue`).collection(`queue`).find({ 'status': 'notified', 'notifiedtime': { '$lt': new Date(Date.now() - ExpirationTime).toISOString() } },{'_id': 0, 'partysize': 1}).toArray( (err, TimedOut)=>{ 
		TimedOut.forEach((entry)=>{
			mongoClient.get().db(`queue`).collection(`queue`).findOne({ _id: entry._id },(err, document)=>{ 
				assert.equal(null, err);
				document.status = `expired`;
				mongoClient.get().db(`history`).collection(todaysDate()).insertOne(document, (err, response)=>{
					assert.equal(null, err);
					updateHistory();
					if(EnableTwilio){
						if(document.registerby == `Twilio`){
							twilioClient.messages
							  .create({
								 body: 'You have not checked in within the alloted time, and have lost your place in line.',
								 from: process.env.TWILIO_PHONE_NUMBER	,
								 to: `+` + document.phonenumber
							   })
							  .then(message => console.log(message.sid));					
						}
					}
					mongoClient.get().db(`queue`).collection(`queue`).deleteOne({ _id: entry._id }, (err, response)=>{
						assert.equal(null, err);
					});
				});
			});
		});
		updateHistory();
		updateWaitList();
	});
	calculateAverageWait();
}

function notifyParty(WaitingParty, callback){
	mongoClient.get().db(`queue`).collection(`queue`).updateOne({ '_id' : WaitingParty._id },{'$set' : { 'status': 'notified', 'notifiedtime' : new Date().toISOString() } },(err, result)=>{
		assert.equal(null, err);
		if(EnableTwilio){
			if(WaitingParty.registerby == `Twilio`){
				twilioClient.messages
				  .create({
					 body: 'It\'s your turn in line. You have five minutes to check in, or you will lose your place.',
					 from: process.env.TWILIO_PHONE_NUMBER	,
					 to: `+` + WaitingParty.phonenumber
				   })
				  .then(message => console.log(message.sid));					
			}
		}
		updateWaitList();
	});
	
}

function updateWaitList(){
	mongoClient.get().db(`queue`).collection(`queue`).find({'partysize': { '$ne': NaN } }).toArray( (err, WaitList)=>{
		assert.equal(null, err);
		io.emit(`WaitList`, WaitList);
		var WaitTotal = 0;
		WaitList.forEach((entry)=>{
			WaitTotal += entry.partysize;
		});
		io.emit(`WaitCount`, WaitTotal);
	});
}

function updateOccupantList(){
	mongoClient.get().db(`queue`).collection(`active`).find().toArray( (err, OccupantList)=>{
		assert.equal(null, err);
		var OccupantTotal = 0;
		OccupantList.forEach((entry)=>{
			OccupantTotal += entry.partysize;
		});
		io.emit(`OccupantCount`, OccupantTotal);
		io.emit(`OccupantList`, OccupantList);
	});
}

function updateHistory(){
	mongoClient.get().db(`history`).collection(todaysDate()).find().toArray( (err, HistoryList)=>{
		assert.equal(null, err);
		io.emit(`HistoryList`, HistoryList);
	});
}

function calculateAverageWait(){
	mongoClient.get().db(`queue`).collection(`active`).find({},{ '_id': 0, 'entrytime': 1, 'exittime': 1}).toArray( (err, OccupantList)=>{
		assert.equal(null, err);
		var TotalTime = 0;
		OccupantList.forEach((item)=>{
			TotalTime += (Date.parse(item.entrytime) - Date.parse(item.timeregistered));
		});
		console.log(`Total Time: ` + TotalTime);
		var AverageTime = (TotalTime/OccupantList.length)/60000;
		EstimatedWaitTime = AverageTime.toFixed(2);
		io.emit(`AverageTime`, AverageTime.toFixed(2));
	});
}

function todaysDate(){
	var date = new Date();
	return(date.getFullYear() + `-` + date.getMonth() + `-` + date.getDate());
}

setInterval(()=>{
    intervalFunction();
}, 5000);

module.exports = router;