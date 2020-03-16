let router = require("express").Router();
const UserModel = require("../models/User");
const ChallengeModel = require('../models/Challenge');
const GameModel = require('../models/Game');
const access = require("../utils/access");
const params = require("../config/parameters");

// From main hall, start game between players 0 and 1
router.post("/games", access.logged, access.ajax, (req,res) => {
  const gameInfo = req.body.gameInfo;
  // Challenge ID is provided if game start from Hall:
  const cid = req.body.cid;
  if (
    Array.isArray(gameInfo.players) &&
    gameInfo.players.some(p => p.id == req.userId) &&
    (!cid || cid.toString().match(/^[0-9]+$/)) &&
    GameModel.checkGameInfo(gameInfo)
  ) {
    if (!!cid) ChallengeModel.remove(cid);
    GameModel.create(
      gameInfo.vid, gameInfo.fen, gameInfo.cadence, gameInfo.players,
      (err, ret) => {
        const oppIdx = (gameInfo.players[0].id == req.userId ? 1 : 0);
        const oppId = gameInfo.players[oppIdx].id;
        UserModel.tryNotify(oppId,
          "Game started: " + params.siteURL + "/#/game/" + ret.id);
        res.json(err || ret);
      }
    );
  }
});

// Get only one game (for Game page)
router.get("/games", access.ajax, (req,res) => {
  const gameId = req.query["gid"];
  if (!!gameId && gameId.match(/^[0-9]+$/)) {
    GameModel.getOne(gameId, (err, game) => {
      res.json({ game: game });
    });
  }
});

// Get by (non-)user ID, for Hall
router.get("/observedgames", access.ajax, (req,res) => {
  const userId = req.query["uid"];
  const cursor = req.query["cursor"];
  if (!!userId.match(/^[0-9]+$/) && !!cursor.match(/^[0-9]+$/)) {
    GameModel.getObserved(userId, (err, games) => {
      res.json({ games: games });
    });
  }
});

// Get by user ID, for MyGames page
router.get("/runninggames", access.ajax, access.logged, (req,res) => {
  GameModel.getRunning(req.userId, (err, games) => {
    res.json({ games: games });
  });
});

router.get("/completedgames", access.ajax, access.logged, (req,res) => {
  const cursor = req.query["cursor"];
  if (!!cursor.match(/^[0-9]+$/)) {
    GameModel.getCompleted(req.userId, cursor, (err, games) => {
      res.json({ games: games });
    });
  }
});

// FEN update + score(Msg) + draw status / and new move + chats
router.put("/games", access.logged, access.ajax, (req,res) => {
  const gid = req.body.gid;
  let obj = req.body.newObj;
  if (gid.toString().match(/^[0-9]+$/) && GameModel.checkGameUpdate(obj)) {
    GameModel.getPlayers(gid, (err,players) => {
      let myColor = '';
      if (players.white == req.userId) myColor = 'w';
      else if (players.black == req.userId) myColor = 'b';
      if (!!myColor) {
        // Did I mark the game for deletion?
        if (!!obj.removeFlag) {
          obj.deletedBy = myColor;
          delete obj["removeFlag"];
        }
        GameModel.update(gid, obj, (err) => {
          if (!err && (!!obj.move || !!obj.score)) {
            // Notify opponent if he enabled notifications:
            const oppid = (myColor == 'w' ? players.black : players.white);
            const messagePrefix =
              !!obj.move
                ? "New move in game: "
                : "Game ended: ";
            UserModel.tryNotify(
              oppid,
              messagePrefix + params.siteURL + "/#/game/" + gid
            );
          }
          res.json(err || {});
        });
      }
    });
  }
});

// TODO: chats deletion here, but could/should be elsewhere.
// Moves update also could, although logical unit in a game.
router.delete("/chats", access.logged, access.ajax, (req,res) => {
  const gid = req.query["gid"];
  GameModel.getPlayers(gid, (err, players) => {
    if ([players.white, players.black].includes(req.userId))
    {
      GameModel.update(gid, { delchat: true }, () => {
        res.json({});
      });
    }
  });
});

module.exports = router;
