// AJAX methods to get, create, update or delete a challenge

let router = require("express").Router();
const access = require("../utils/access");
const ChallengeModel = require("../models/Challenge");
const checkChallenge = require("../data/challengeCheck.js");

router.post("/challenges/:vid([0-9]+)", access.logged, access.ajax, (req,res) => {
	const vid = req.params["vid"];
	const chall = {
		uid: req.userId,
		vid: vid,
		fen: req.body["fen"],
		mainTime: req.body["mainTime"],
		increment: req.body["increment"],
		nbPlayers: req.body["nbPlayers"],
		players: req.body["players"],
	};
	const error = checkChallenge(chall);
	ChallengeModel.create(chall, (err,lastId) => {
		res.json(err || {cid: lastId["rowid"]});
	});
});

//// index
//router.get("/challengesbyplayer", access.logged, access.ajax, (req,res) => {
//	if (req.query["uid"] != req.user._id)
//		return res.json({errmsg: "Not your challenges"});
//	let uid = ObjectID(req.query["uid"]);
//	ChallengeModel.getByPlayer(uid, (err, challengeArray) => {
//		res.json(err || {challenges: challengeArray});
//	});
//});
//
//function createChallenge(vid, from, to, res)
//{
//	ChallengeModel.create(vid, from, to, (err, chall) => {
//		res.json(err || {
//			// A challenge can be sent using only name, thus 'to' is returned
//			to: chall.to,
//			cid: chall._id
//		});
//	});
//}
//
//// from[, to][,nameTo]
//router.post("/challenges", access.logged, access.ajax, (req,res) => {
//	if (req.body.from != req.user._id)
//		return res.json({errmsg: "Identity usurpation"});
//	let from = ObjectID(req.body.from);
//	let to = !!req.body.to ? ObjectID(req.body.to) : undefined;
//	let nameTo = !!req.body.nameTo ? req.body.nameTo : undefined;
//	let vid = ObjectID(req.body.vid);
//	if (!to && !!nameTo)
//	{
//		UserModel.getByName(nameTo, (err,user) => {
//			access.checkRequest(res, err, user, "Opponent not found", () => {
//				createChallenge(vid, from, user._id, res);
//			});
//		});
//	}
//	else if (!!to)
//		createChallenge(vid, from, to, res);
//	else
//		createChallenge(vid, from, undefined, res); //automatch
//});
//
//router.delete("/challenges", access.logged, access.ajax, (req,res) => {
//	let cid = ObjectID(req.query.cid);
//	ChallengeModel.getById(cid, (err,chall) => {
//		access.checkRequest(res, err, chall, "Challenge not found", () => {
//			if (!chall.from.equals(req.user._id) && !!chall.to && !chall.to.equals(req.user._id))
//				return res.json({errmsg: "Not your challenge"});
//			ChallengeModel.remove(cid, err => {
//				res.json(err || {});
//			});
//		});
//	});
//});

module.exports = router;
