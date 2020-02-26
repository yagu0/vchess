let router = require("express").Router();
const UserModel = require("../models/User");
const ChallengeModel = require('../models/Challenge');
const GameModel = require('../models/Game');
const access = require("../utils/access");
const params = require("../config/parameters");

// From main hall, start game between players 0 and 1
router.post("/games", access.logged, access.ajax, (req,res) => {
  const gameInfo = req.body.gameInfo;
  const cid = req.body.cid;
  if (
    Array.isArray(gameInfo.players) &&
    gameInfo.players.some(p => p.id == req.userId) &&
    cid.toString().match(/^[0-9]+$/) &&
    GameModel.checkGameInfo(gameInfo)
  ) {
    ChallengeModel.remove(cid);
    GameModel.create(
      gameInfo.vid, gameInfo.fen, gameInfo.cadence, gameInfo.players,
      (err,ret) => {
        const oppIdx = (gameInfo.players[0].id == req.userId ? 1 : 0);
        const oppId = gameInfo.players[oppIdx].id;
        UserModel.tryNotify(oppId,
          "Game started: " + params.siteURL + "/#/game/" + ret.gid);
        res.json({gameId: ret.gid});
      }
    );
  }
});

router.get("/games", access.ajax, (req,res) => {
  const gameId = req.query["gid"];
  if (gameId)
  {
    if (gameId.match(/^[0-9]+$/))
    {
      GameModel.getOne(gameId, false, (err,game) => {
        res.json({game: game});
      });
    }
  }
  else
  {
    // Get by (non-)user ID:
    const userId = req.query["uid"];
    if (userId.match(/^[0-9]+$/))
    {
      const excluded = !!req.query["excluded"];
      GameModel.getByUser(userId, excluded, (err,games) => {
        res.json({games: games});
      });
    }
  }
});

// New move + fen update + score + chats...
router.put("/games", access.logged, access.ajax, (req,res) => {
  const gid = req.body.gid;
  const obj = req.body.newObj;
  if (gid.toString().match(/^[0-9]+$/) && GameModel.checkGameUpdate(obj))
  {
    GameModel.getPlayers(gid, (err,players) => {
      if (players.some(p => p.uid == req.userId))
      {
        GameModel.update(gid, obj, (err) => {
          if (!err && (obj.move || obj.score))
          {
            // Notify opponent if he enabled notifications:
            const oppid = players[0].uid == req.userId
              ? players[1].uid
              : players[0].uid;
            const messagePrefix = obj.move
              ? "New move in game: "
              : "Game ended: ";
            UserModel.tryNotify(oppid,
              messagePrefix + params.siteURL + "/#/game/" + gid);
          }
          res.json(err || {});
        });
      }
    });
  }
});

module.exports = router;
