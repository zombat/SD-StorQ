# Social Distance StoreQ
SMS and manual queue web app to manage entry to a facility. (Pronounced as stork)

# Quick Start
	1: Install NPM
		https://docs.npmjs.com/downloading-and-installing-node-js-and-npm

	2: Clone https://github.com/zombat/SD-StorQ
		https://git-scm.com/book/en/v2/Git-Basics-Getting-a-Git-Repository

	3: Install dependencies w/ the npm install command
		https://docs.npmjs.com/cli/install
		
	4: Deploy a MongoDB Server or Atlas Cluster
		https://docs.atlas.mongodb.com/getting-started/
		
	5: Configure .env file based on example.env
	
	6: Test 
		#node app.js

	7: (HIGHLY RECCOMENDED): Generate cert and enable HTTPS
		https://letsencrypt.org/
		
	8: (HIGHLY RECCOMENDED):Set up a reverse-proxy
		https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
		
	9: Create a Twilio account, add an application (set your webhook to HTTPS://WHATEVERYOURDNSNAMEIS/sms)
		https://www.twilio.com/docs/quickstart
		
	10: Add Twilio information to .env file
	
	11: Set up PM2 to manage your server app
		https://pm2.keymetrics.io/docs/usage/quick-start/
		
	12: Register your users using the web app, and stop app.js
	
	13: Set ENABLE_REGISTRATION to false in the .env file
	
	14: Restart app.js