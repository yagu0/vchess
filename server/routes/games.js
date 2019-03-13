router.get("/games", access.logged, access.ajax, (req,res) => {
  const excluded = req.query["excluded"]; //TODO: think about query params here
});

// TODO: adapt for correspondance play

var router = require("express").Router();
var UserModel = require("../models/User");
var GameModel = require('../models/Game');
var VariantModel = require('../models/Variant');
var ObjectId = require("bson-objectid");
var access = require("../utils/access");

// Notify about a game (start, new move)
function tryNotify(uid, gid, vname, subject)
{
	UserModel.getOne("id", uid, (err,user) => {
		if (!!err && user.notify)
		{
			maild.send({
				from: params.mailFrom,
				to: user.email,
				subject: subject,
				body: params.siteURL + "?v=" + vname + "&g=" + gid
			}, err => {
				// TODO: log error somewhere.
			});
		}
	)};
}

// From variant page, start game between player 0 and 1
router.post("/games", access.logged, access.ajax, (req,res) => {
	let variant = JSON.parse(req.body.variant);
	let players = JSON.parse(req.body.players);
	if (!players.includes(req.user._id.toString())) //TODO: should also check challenge...
		return res.json({errmsg: "Cannot start someone else's game"});
	let fen = req.body.fen;
	// Randomly shuffle colors white/black
	if (Math.random() < 0.5)
		players = [players[1],players[0]];
	GameModel.create(
		ObjectId(variant._id), [ObjectId(players[0]),ObjectId(players[1])], fen,
		(err,game) => {
			access.checkRequest(res, err, game, "Cannot create game", () => {
				if (!!req.body.offlineOpp)
					UserModel.tryNotify(ObjectId(req.body.offlineOpp), game._id, variant.name, "New game");
				game.movesLength = game.moves.length; //no need for all moves here
				delete game["moves"];
				res.json({game: game});
			});
		}
	);
});

// game page
router.get("/games", access.ajax, (req,res) => {
	let gameID = req.query["gid"];
	GameModel.getById(ObjectId(gameID), (err,game) => {
		access.checkRequest(res, err, game, "Game not found", () => {
			res.json({game: game});
		});
	});
});

router.put("/games", access.logged, access.ajax, (req,res) => {
	let gid = ObjectId(req.body.gid);
	let result = req.body.result;
	// NOTE: only game-level life update is "gameover"
	GameModel.gameOver(gid, result, ObjectId(req.user._id), (err,game) => {
		access.checkRequest(res, err, game, "Cannot find game", () => {
			res.json({});
		});
	});
});

// variant page
router.get("/gamesbyvariant", access.logged, access.ajax, (req,res) => {
	if (req.query["uid"] != req.user._id)
		return res.json({errmsg: "Not your games"});
	let uid = ObjectId(req.query["uid"]);
	let vid = ObjectId(req.query["vid"]);
	GameModel.getByVariant(uid, vid, (err,gameArray) => {
		// NOTE: res.json already stringify, no need to do it manually
		res.json(err || {games: gameArray});
	});
});

// For index: only moves count + myColor
router.get("/gamesbyplayer", access.logged, access.ajax, (req,res) => {
	if (req.query["uid"] != req.user._id)
		return res.json({errmsg: "Not your games"});
	let uid = ObjectId(req.query["uid"]);
	GameModel.getByPlayer(uid, (err,games) => {
		res.json(err || {games: games});
	});
});

// TODO: if newmove fail, takeback in GUI
// TODO: check move structure
// TODO: for corr games, move should contain an optional "message" field ("corr chat" !)
router.post("/moves", access.logged, access.ajax, (req,res) => {
	let gid = ObjectId(req.body.gid);
	let fen = req.body.fen;
	let vname = req.body.vname; //defined only if !!offlineOpp
	// NOTE: storing the moves encoded lead to double stringify --> error at parsing
	let move = JSON.parse(req.body.move);
	GameModel.addMove(gid, move, fen, req._user._id, (err,game) => {
		access.checkRequest(res, err, game, "Cannot find game", () => {
			if (!!req.body.offlineOpp)
				UserModel.tryNotify(ObjectId(req.body.offlineOpp), gid, vname, "New move");
			res.json({});
		});
	});
});

module.exports = router;
