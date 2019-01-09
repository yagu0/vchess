var router = require("express").Router();
var UserModel = require('../models/User');
var sendEmail = require('../utils/mailer');
var TokenGen = require("../utils/tokenGenerator");
var access = require("../utils/access");
var params = require("../config/parameters");
var checkNameEmail = require("../public/javascripts/shared/userCheck")

// to: object user (to who we send an email)
function setAndSendLoginToken(subject, to, res)
{
	// Set login token and send welcome(back) email with auth link
	const token = TokenGen.generate(params.token.length);
	UserModel.setLoginToken(token, to.id, err => {
		if (!!err)
			return res.json({errmsg: err.toString()});
		const body =
			"Hello " + to.name + "!\n" +
			"Access your account here: " +
			params.siteURL + "/authenticate?token=" + token + "\\n" +
			"Token will expire in " + params.token.expire/(1000*60) + " minutes."
		sendEmail(params.mail.noreply, to.email, subject, body, err => {
			res.json(err || {});
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
	UserModel.create(name, email, notify, (err,uid) => {
		if (!!err)
			return res.json({errmsg: err.toString()});
		const user = {
			id: uid["rowid"],
			name: name,
			email: email,
		};
		setAndSendLoginToken("Welcome to " + params.siteURL, user, res);
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
	UserModel.getOne("loginToken", req.query.token, (err,user) => {
		access.checkRequest(res, err, user, "Invalid token", () => {
			// If token older than params.tokenExpire, do nothing
			if (Date.now() > user.loginTime + params.token.expire)
				return res.json({errmsg: "Token expired"});
			// Generate session token (if not exists) + destroy login token
			UserModel.trySetSessionToken(user.id, (err,token) => {
				if (!!err)
					return res.json({errmsg: err.toString()});
				// Set cookie
				res.cookie("token", token, {
					httpOnly: true,
					secure: !!params.siteURL.match(/^https/),
					maxAge: params.cookieExpire,
				});
				res.redirect("/");
			});
		});
	});
});

router.put('/update', access.logged, access.ajax, (req,res) => {
	const name = req.body.name;
	const email = req.body.email;
	const error = checkNameEmail({name: name, email: email});
	if (!!error)
		return res.json({errmsg: error});
	const user = {
		id: req.userId,
		name: name,
		email: email,
		notify: !!req.body.notify,
	};
	UserModel.updateSettings(user, err => {
		res.json(err ? {errmsg: err.toString()} : {});
	});
});

// Logout on server because the token cookie is httpOnly
router.get('/logout', access.logged, (req,res) => {
	res.clearCookie("token");
	res.redirect('/');
});

module.exports = router;
