var router = require("express").Router();
var UserModel = require("../models/User");
var ChallengeModel = require('../models/Challenge');
var GameModel = require('../models/Game');
var VariantModel = require('../models/Variant');
var access = require("../utils/access");
var params = require("../config/parameters");

// From main hall, start game between players 0 and 1
router.post("/games", access.logged, access.ajax, (req,res) => {
  const gameInfo = req.body.gameInfo;
	if (!gameInfo.players.some(p => p.id == req.userId))
		return res.json({errmsg: "Cannot start someone else's game"});
  const cid = req.body.cid;
  ChallengeModel.remove(cid);
	const fen = req.body.fen;
	GameModel.create(
    gameInfo.vid, gameInfo.fen, gameInfo.timeControl, gameInfo.players,
		(err,ret) => {
			access.checkRequest(res, err, ret, "Cannot create game", () => {
        const oppIdx = (gameInfo.players[0].id == req.userId ? 1 : 0);
        const oppId = gameInfo.players[oppIdx].id;
        UserModel.tryNotify(oppId,
          "New game: " + params.siteURL + "/game/" + ret.gid);
				res.json({gameId: ret.gid});
			});
		}
	);
});

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
		  if (!!err)
        return res.json({errmsg: err.errmsg || err.toString()});
			res.json({games: games});
	  });
  }
});

//////////////////////////////////

// TODO: new move
router.put("/games", access.logged, access.ajax, (req,res) => {
	let gid = ObjectId(req.body.gid);
	let result = req.body.result;
	// NOTE: only game-level life update is "gameover"
	GameModel.gameOver(gid, result, ObjectId(req.userId), (err,game) => {
		access.checkRequest(res, err, game, "Cannot find game", () => {
			res.json({});
		});
	});
});

// TODO: if newmove fail, takeback in GUI
// TODO: check move structure
// TODO: move should contain an optional "message" field ("corr chat" !)
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
