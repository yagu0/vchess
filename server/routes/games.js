var router = require("express").Router();
var UserModel = require("../models/User");
var sendEmail = require('../utils/mailer');
var GameModel = require('../models/Game');
var VariantModel = require('../models/Variant');
var access = require("../utils/access");
var params = require("../config/parameters");

// Notify about a game (start, new move)
function tryNotify(uid, gid, vname, subject)
{
	UserModel.getOne("id", uid, (err,user) => {
		if (!!err && user.notify)
		{
			sendEmail(params.mailFrom, user.email, subject,
				params.siteURL + "?v=" + vname + "&g=" + gid, err => {
				  res.json(err || {}); // TODO: log error somewhere.
			  }
      );
		}
	)};
}

// From main hall, start game between players 0 and 1
router.post("/games", access.logged, access.ajax, (req,res) => {
	const gameInfo = JSON.parse(req.body.gameInfo);
	if (!gameInfo.players.some(p => p.id == req.user.id))
		return res.json({errmsg: "Cannot start someone else's game"});
	let fen = req.body.fen;
	GameModel.create(
    gameInfo.vid, gameInfo.fen, gameInfo.timeControl, gameInfo.players,
		(err,game) => {
			access.checkRequest(res, err, game, "Cannot create game", () => {
				if (!!req.body.offlineOpp)
					UserModel.tryNotify(req.body.offlineOpp, game.id, variant.name,
            "New game: " + "game link"); //TODO: give game link
				res.json({game: game});
			});
		}
	);
});

// game page
router.get("/games", access.ajax, (req,res) => {
	const gameId = req.query["gid"];
	if (!!gameId)
  {
    GameModel.getOne(gameId, (err,game) => {
		  access.checkRequest(res, err, game, "Game not found", () => {
			  res.json({game: game});
		  });
	  });
  }
  else
  {
    // Get by (non-)user ID:
    const userId = req.query["uid"];
    const excluded = !!req.query["excluded"];
    GameModel.getByUser(userId, excluded, (err,games) => {
		  access.checkRequest(res, err, games, "Games not found", () => {
			  res.json({games: games});
		  });
	  });
  }
});

// TODO:
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
