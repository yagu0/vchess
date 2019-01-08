var router = require("express").Router();
var ObjectID = require("bson-objectid");
var ChallengeModel = require('../models/Challenge');
var UserModel = require('../models/User');
var ObjectID = require("bson-objectid");
var access = require("../utils/access");

// Only AJAX requests here (from variant page and index)

// variant page
router.get("/challengesbyvariant", access.logged, access.ajax, (req,res) => {
	if (req.query["uid"] != req.user._id)
		return res.json({errmsg: "Not your challenges"});
	let uid = ObjectID(req.query["uid"]);
	let vid = ObjectID(req.query["vid"]);
	ChallengeModel.getByVariant(uid, vid, (err, challengeArray) => {
		res.json(err || {challenges: challengeArray});
	});
});

// index
router.get("/challengesbyplayer", access.logged, access.ajax, (req,res) => {
	if (req.query["uid"] != req.user._id)
		return res.json({errmsg: "Not your challenges"});
	let uid = ObjectID(req.query["uid"]);
	ChallengeModel.getByPlayer(uid, (err, challengeArray) => {
		res.json(err || {challenges: challengeArray});
	});
});

function createChallenge(vid, from, to, res)
{
	ChallengeModel.create(vid, from, to, (err, chall) => {
		res.json(err || {
			// A challenge can be sent using only name, thus 'to' is returned
			to: chall.to,
			cid: chall._id
		});
	});
}

// from[, to][,nameTo]
router.post("/challenges", access.logged, access.ajax, (req,res) => {
	if (req.body.from != req.user._id)
		return res.json({errmsg: "Identity usurpation"});
	let from = ObjectID(req.body.from);
	let to = !!req.body.to ? ObjectID(req.body.to) : undefined;
	let nameTo = !!req.body.nameTo ? req.body.nameTo : undefined;
	let vid = ObjectID(req.body.vid);
	if (!to && !!nameTo)
	{
		UserModel.getByName(nameTo, (err,user) => {
			access.checkRequest(res, err, user, "Opponent not found", () => {
				createChallenge(vid, from, user._id, res);
			});
		});
	}
	else if (!!to)
		createChallenge(vid, from, to, res);
	else
		createChallenge(vid, from, undefined, res); //automatch
});

router.delete("/challenges", access.logged, access.ajax, (req,res) => {
	let cid = ObjectID(req.query.cid);
	ChallengeModel.getById(cid, (err,chall) => {
		access.checkRequest(res, err, chall, "Challenge not found", () => {
			if (!chall.from.equals(req.user._id) && !!chall.to && !chall.to.equals(req.user._id))
				return res.json({errmsg: "Not your challenge"});
			ChallengeModel.remove(cid, err => {
				res.json(err || {});
			});
		});
	});
});

module.exports = router;
