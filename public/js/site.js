$( document ).ready(()=>{
	
	socket.on(`HistoryList`, (HistoryList)=>{
		  $(`#HistoryList-TargetArea`).empty();
		  HistoryList.forEach((entry)=>{
			  var appendMe = `<div class="row margin-10">`;
			  if(entry.status == `expired` || entry.status == `invalid`){
				  appendMe += `<div class="col btn btn-danger">`;
			  } else {
				  appendMe += `<div class="col btn btn-secondary">`;
			  }
				appendMe += `<p>Number: ` +  entry.phonenumber + `</p>`;
				appendMe += `<p>Name: ` +  entry.name + `</p>`;
				appendMe += `<p>Group Size: ` + entry.partysize + `</p>`;
				appendMe += `<p>Status Message: ` + entry.status + `</p>`;
				appendMe += `</div>`;
				appendMe += `</div>`;
			  $(`#HistoryList-TargetArea`).append(appendMe);
		  });
	  });
	
	  socket.on(`OccupantList`, (OccupantList)=>{
		  $(`#OccupantList-TargetArea`).empty();
		  OccupantList.forEach((entry)=>{
			  var appendMe = `<div class="row margin-10"><div class="col-9 bg-primary left-rounded-blue">`;
				appendMe += `<p>Number: ` +  entry.phonenumber + `</p>`;
				appendMe += `<p>Name: ` +  entry.name + `</p>`;
				appendMe += `<p>Group Size: ` + entry.partysize + `</p>`;
				appendMe += `</div><button class="col-2 bg-danger right-rounded-red check-in-button" onclick="checkInOut('` + entry._id + `', 'out', '` + entry.phonenumber + `', '` + entry.name + `')"><h1>&#10008</h1></button></div>`;
			  $(`#OccupantList-TargetArea`).append(appendMe);
		  });
	  });
	  
	  socket.on(`WaitList`, (WaitList)=>{
		  $(`#WaitList-TargetArea`).empty();
		  WaitList.forEach((entry)=>{
			  var appendMe = `<div class="row margin-10">`;
			  if(entry.status == `notified`) {
				  appendMe += `<div class="col-9 bg-success left-rounded-green">`;
			  } else if(entry.status == `waiting`) {
				  appendMe += `<div class="col-11 bg-warning rounded margin-left-10">`;
			  } else {
				  appendMe += `<div class="col-11 bg-danger rounded margin-left-10">`;
			  }
				appendMe += `<p>Number: ` + entry.phonenumber + `</p>`;
				appendMe += `<p>Name: ` + entry.name + `</p>`;
				appendMe += `<p>Group Size: ` + entry.partysize + `</p>`;
				appendMe += `</div>`;
				if(entry.status == `notified`) {
					appendMe += `<button class="col-2 bg-success right-rounded-green check-in-button" onclick="checkInOut('` + entry._id + `', 'in', '` + entry.phonenumber + `', '` + entry.name + `')"><h1>&#10003</h1></button>`;
				}
				appendMe += `</div>`;		  
			  $(`#WaitList-TargetArea`).append(appendMe);
		  });
	  });
	  
	  socket.on(`WaitCount`, (WaitCount)=>{
		  $(`#Wait-Count`).html(WaitCount);
	  });
	  
	  socket.on(`OccupantCount`, (OccupantCount)=>{
		  $(`#Occupant-Count`).html(OccupantCount);
	  });
	  
	  socket.on(`AverageTime`, (AverageTime)=>{
		  if(AverageTime == `NaN`){
			  AverageTime = `0.01`;
		  }
		  $(`#Average-Time`).html(AverageTime);
	  });
	
});



function checkInOut(documentID, direction, phonenumber, name){
	if(direction == `in` || direction == `out`){
		if(confirm(`Confirm check-` + direction + ` for:\n` + name + `\n` + phonenumber)){
			sendData(JSON.stringify({ 'message': 'check-in', 'id': documentID, 'direction': direction }));
		}
	} else if(direction == `manual-registration`){
		var name = prompt(`Customer Name`);
		var partysize = parseInt(prompt(`Party Size`));
		var phonenumber = prompt(`Phone or Ticket Number`);
		if(confirm(`Confirm registration` + ` for:\n` + partysize + ` people\n`+ name + `\n` + phonenumber)){
			sendData(JSON.stringify({ 'direction': 'manual-registration', 'name' : name, 'phonenumber' : phonenumber, 'partysize' : partysize }));
		}
	}			
}

function sendData(data){
		$.ajax({
		type: `POST`,
		url: `/api`,
		data: data,
		contentType: `application/json; charset=utf-8`,
		dataType: `json`,
		success: function(data){
			
		},
		failure: function(err) {
			console.log(`error`);
			console.log(err);
		},
		error: function(jqXHR, exception ){
			location.reload();	
		},
		timeout: 5000
	});
}

function logout(){
	window.location = `/logout`;
}