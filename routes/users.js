var router = require("express").Router();
var UserModel = require('../models/User');
var sendEmail = require('../utils/mailer');
var TokenGen = require("../utils/tokenGenerator");
var access = require("../utils/access");
var params = require("../config/parameters");
var checkNameEmail = require("../public/javascripts/shared/userCheck")

// to: object user
function setAndSendLoginToken(subject, to, res)
{
	// Set login token and send welcome(back) email with auth link
	let token = TokenGen.generate(params.token.length);
	UserModel.setLoginToken(token, to._id, (err,ret) => {
		access.checkRequest(res, err, ret, "Cannot set login token", () => {
			const body =
				"Hello " + to.name + "!\n" +
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
	const name = req.body.name;
	const email = req.body.email;
	const notify = !!req.body.notify;
	const error = checkNameEmail({name: name, email: email});
	if (!!error)
		return res.json({errmsg: error});
	UserModel.create(name, email, notify, (err,user) => {
		access.checkRequest(res, err, user, "Registration failed", () => {
			setAndSendLoginToken("Welcome to " + params.siteURL, user, res);
		});
	});
});

router.get('/sendtoken', access.unlogged, access.ajax, (req,res) => {
	const nameOrEmail = decodeURIComponent(req.query.nameOrEmail);
	const type = (nameOrEmail.indexOf('@') >= 0 ? "email" : "name");
	const error = checkNameEmail({[type]: nameOrEmail});
	if (!!error)
		return res.json({errmsg: error});
	UserModel.getOne(type, nameOrEmail, (err,user) => {
		access.checkRequest(res, err, user, "Unknown user", () => {
			setAndSendLoginToken("Token for " + params.siteURL, user, res);
		});
	});
});

router.get('/authenticate', access.unlogged, (req,res) => {
	UserModel.getByLoginToken(req.query.token, (err,user) => {
		access.checkRequest(res, err, user, "Invalid token", () => {
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
	let user = JSON.parse(req.body.user);
	const error = checkNameEmail({name: user.name, email: user.email});
	if (!!error)
		return res.json({errmsg: error});
	user.notify = !!user.notify; //in case of...
	user._id = res.locals.user._id; //in case of...
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
