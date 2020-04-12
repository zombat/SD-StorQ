const	express = require(`express`),
		speakeasy = require(`speakeasy`),
		router = express.Router(),
		User = require(`../models/user`),
		middlewares = require(`../middlewares/index`),
		{ isLoggedIn } = require(`../middlewares/index`);


router.post(`/enable/tfa`, isLoggedIn, (req, res)=>{
    User.findById(req.user._id).then((rUser)=>{
        if(!rUser){
            res.redirect(`/`);
        }

        const secretBase32 = rUser.secret_key.secret

        const verified = speakeasy.totp.verify({
            secret: secretBase32,
            encoding: 'base32',
            token: req.body.tfa,
            window: 0
          });
          
        if(verified){
           rUser.secret_key.authenticated = true; 
           rUser.tfa = true;
           rUser.save();
        }
        res.redirect(`/queue`);
    }).catch((err)=>{
        console.log(err);
    })
});

router.get(`/verification/tfa`, middlewares.isLoggedIn, (req, res)=>{
    User.findById(req.user._id).then((rUser)=>{
        if(!rUser.tfa){
            return res.redirect(`/dashboard`);
        }
        res.render(`verification`);
    })
});


router.post(`/verification/tfa`, middlewares.isLoggedIn, (req, res)=>{
    User.findById(req.user._id).then((rUser)=>{
        if(!rUser.tfa){
            return res.redirect(`/dashboard`);
        }

        const secretBase32 = rUser.secret_key.secret;	
		
        const token = speakeasy.totp({
            secret: secretBase32,
            encoding: 'base32',
        });
        
        const verified = speakeasy.totp.verify({
            secret: secretBase32,
            encoding: 'base32',
            token: req.body.tfa,
            window: 0
          });

          if(verified){
              rUser.secret_key.authenticated = true; 
              rUser.tfa = true;
              rUser.save();
              return res.redirect(`/queue`);
          }else{
              res.redirect(`/verification/tfa`);
          }
    })
});

module.exports = router;