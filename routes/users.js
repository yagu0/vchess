var router = require("express").Router();
var UserModel = require('../models/User');
var sendEmail = require('../utils/mailer');
var TokenGen = require("../utils/tokenGenerator");
var access = require("../utils/access");
var params = require("../config/parameters");

// to: object user
function setAndSendLoginToken(subject, to, res)
{
	// Set login token and send welcome(back) email with auth link
	let token = TokenGen.generate(params.token.length);
	UserModel.setLoginToken(token, to._id, (err,ret) => {
		access.checkRequest(res, err, ret, "Cannot set login token", () => {
			const body =
				"Hello " + to.initials + "!\n" +
				"Access your account here: " +
				params.siteURL + "/authenticate?token=" + token + "\\n" +
				"Token will expire in " + params.token.expire/(1000*60) + " minutes."
			sendEmail(params.mail.from, to.email, subject, body, err => {
				res.json(err || {});
			});
		});
	});
}

// AJAX user life cycle...

router.post('/register', access.unlogged, access.ajax, (req,res) => {
	let name = decodeURIComponent(req.body.name);
	let email = decodeURIComponent(req.body.email);
	let error = checkObject({name:name, email:email}, "User");
	if (error.length > 0)
		return res.json({errmsg: error});
	UserModel.create(name, email, (err,user) => {
		access.checkRequest(res, err, user, "Registration failed", () => {
			setAndSendLoginToken("Welcome to " + params.siteURL, user, res);
		});
	});
});

router.put('/sendtoken', access.unlogged, access.ajax, (req,res) => {
	let email = decodeURIComponent(req.body.email);
	let error = checkObject({email:email}, "User");
	if (error.length > 0)
		return res.json({errmsg: error});
	UserModel.getOne("email", email, (err,user) => {
		access.checkRequest(res, err, user, "Unknown user", () => {
			setAndSendLoginToken("Token for " + params.siteURL, user, res);
		});
	});
});

router.get('/authenticate', access.unlogged, (req,res) => {
	UserModel.getByLoginToken(req.query.token, (err,user) => {
		access.checkRequest(res, err, user, "Invalid token", () => {
			let tsNow = Date.now();
			// If token older than params.tokenExpire, do nothing
			if (Date.now() > user.loginTime + params.token.expire)
				return res.json({errmsg: "Token expired"});
			// Generate session token (if not exists) + destroy login token
			UserModel.trySetSessionToken(user._id, (err,token) => {
				if (!!err)
					return res.json(err);
				// Set cookie
				res.cookie("token", token, {
					httpOnly: true,
					secure: true,
					maxAge: params.cookieExpire
				});
				res.redirect("/");
			});
		});
	});
});

router.put('/settings', access.logged, access.ajax, (req,res) => {
	const user = JSON.parse(req.body.user);
	// TODO: either verify email + name, or re-apply the following logic:
	//let error = checkObject(user, "User");
	//if (error.length > 0)
	//	return res.json({errmsg: error});
	user._id = req.user._id; //TODO:
	UserModel.updateSettings(user, (err,ret) => {
		access.checkRequest(res, err, ret, "Settings update failed", () => {
			res.json({});
		});
	});
});

// Logout on server because the token cookie is secured + http-only
router.get('/logout', access.logged, (req,res) => {
	res.clearCookie("token");
	res.redirect('/');
});

module.exports = router;
