const	express = require(`express`),
		router = express.Router(),
		User = require(`../../models/user`),
		speakeasy = require(`speakeasy`),
		{ isLoggedIn } = require(`../../middlewares/index`),
		QRCode = require(`qrcode`);


router.post(`/users/secret`, isLoggedIn, (req, res)=>{

    User.findById(req.user._id).then((rUser)=>{
        if(!rUser){
            res.redirect(`/`);
        }

        const activate = rUser.tfa;
        const secret = speakeasy.generateSecret({length: 20, name: 'Test'});
        // const otpAuthUrl = speakeasy.otpauthURL({ secret: secret.base32, label: rUser.username + " Node-2fa" });

        QRCode.toDataURL(secret.otpauth_url,(err, image_data)=>{
            rUser.secret_key.secret = secret.base32;
            rUser.save();

            res.json({ error: false, activate, data: { secret: secret.base32, secret_uri:  image_data}});
          });
        
    }).catch((e)=>{
        console.log(e);
        res.json({ error: true, data: e})
    });
}); 

router.post(`/disable/tfa`, isLoggedIn, (req, res)=>{
    User.findByIdAndUpdate(req.user._id,{ tfa: false }).then((rUser)=>{
        res.json({ error: false,});
    }).catch((err)=>{
        res.json({ error: true,});
    })
});


module.exports = router;

