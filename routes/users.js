var router = require("express").Router();
var UserModel = require('../models/User');
var maild = require('../utils/mailer');
var TokenGen = require("../utils/tokenGenerator");
var access = require("../utils/access");

// to: object user
function setAndSendLoginToken(subject, to, res)
{
	// Set login token and send welcome(back) email with auth link
	let token = TokenGen.generate(params.token.length);
	UserModel.setLoginToken(token, to._id, to.ip, (err,ret) => {
		access.checkRequest(res, err, ret, "Cannot set login token", () => {
			maild.send({
				from: params.mail.from,
				to: to.email,
				subject: subject,
				body: "Hello " + to.initials + "!\n" +
					"Access your account here: " +
					params.siteURL + "/authenticate?token=" + token + "\\n" +
					"Token will expire in " + params.token.expire/(1000*60) + " minutes."
			}, err => {
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
			user.ip = req.ip;
			setAndSendLoginToken("Welcome to " + params.siteURL, user, res);
		});
	});
});

router.put('/sendtoken', access.unlogged, access.ajax, (req,res) => {
	let email = decodeURIComponent(req.body.email);
	let error = checkObject({email:email}, "User");
	console.log(email)
	if (error.length > 0)
		return res.json({errmsg: error});
	UserModel.getByEmail(email, (err,user) => {
		access.checkRequest(res, err, user, "Unknown user", () => {
			setAndSendLoginToken("Token for " + params.siteURL, user, res);
		});
	});
});

router.get('/authenticate', access.unlogged, (req,res) => {
	UserModel.getByLoginToken(req.query.token, (err,user) => {
		access.checkRequest(res, err, user, "Invalid token", () => {
			if (user.loginToken.ip != req.ip)
				return res.json({errmsg: "IP address mismatch"});
			let now = new Date();
			let tsNow = now.getTime();
			// If token older than params.tokenExpire, do nothing
			if (user.loginToken.timestamp + params.token.expire < tsNow)
				return res.json({errmsg: "Token expired"});
			// Generate and update session token + destroy login token
			let token = TokenGen.generate(params.token.length);
			UserModel.setSessionToken(token, user._id, (err,ret) => {
				if (!!err)
					return res.json(err);
				// Set cookie
				res.cookie("token", token, {
					httpOnly: true,
					maxAge: params.cookieExpire
				});
				res.redirect("/");
			});
		});
	});
});

router.put('/settings', access.logged, access.ajax, (req,res) => {
	let user = JSON.parse(req.body.user);
	let error = checkObject(user, "User");
	if (error.length > 0)
		return res.json({errmsg: error});
	user._id = ObjectID(req.user._id);
	UserModel.updateSettings(user, (err,ret) => {
		access.checkRequest(res, err, ret, "Settings update failed", () => {
			res.json({});
		});
	});
});

router.get('/logout', access.logged, (req,res) => {
	// TODO: cookie + redirect is enough (https, secure cookie
	// https://www.information-security.fr/securite-sites-web-lutilite-flags-secure-httponly/ )
	UserModel.logout(req.cookies.token, (err,ret) => {
		access.checkRequest(res, err, ret, "Logout failed", () => {
			res.clearCookie("token");
			req.user = null;
			res.redirect('/');
		});
	});
});

module.exports = router;
