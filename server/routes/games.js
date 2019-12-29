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

// New move + fen update + score, potentially
// TODO: if newmove fail, takeback in GUI
router.put("/games", access.logged, access.ajax, (req,res) => {
  const gid = req.body.gid;
	const obj = req.body.newObj;
	GameModel.update(gid, obj, (err) => {
		if (!!err)
      return res.json(err);
    // Notify opponent if he enabled notifications:
    GameModel.getPlayers(gid, (err2,players) => {
      if (!!err2)
        return res.json(err);
      const oppid = (players[0].id == req.userId ? players[1].id : players[0].id);
      UserModel.tryNotify(oppid,
        "New move in game: " + params.siteURL + "/game/" + gid);
    });
    res.json({});
	});
});

module.exports = router;
