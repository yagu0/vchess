// TODO: general methods to access/retrieve from storage, to be generalized
// https://developer.mozilla.org/fr/docs/Web/API/API_IndexedDB
// https://dexie.org/

import { extractTime } from "@/utils/timeControl";
import { shuffle } from "@/utils/alea";

export const GameStorage =
{
  init: function(o)
  {
    localStorage.setItem("gameId", o.gameId);
    localStorage.setItem("vname", o.vname);
    // NOTE: when >= 3 players, better use an array + shuffle for mycolor
    const mycolor = (Math.random() < 0.5 ? "w" : "b");
    localStorage.setItem("mycolor", mycolor);
    localStorage.setItem("fenStart", o.fenStart);
    localStorage.setItem("fen", o.fenStart);
    localStorage.setItem("moves", JSON.stringify([]));
    // Shuffle players order (white then black then other colors).
    localStorage.setItem("players", JSON.stringify(shuffle(o.players)));
    // Extract times (in [milli]seconds), set clocks, store in localStorage
    const tc = extractTime(o.timeControl);
    localStorage.setItem("timeControl", o.timeControl);
    localStorage.setItem("clocks", JSON.stringify(
      [...Array(o.players.length)].fill(tc.mainTime)));
    localStorage.setItem("increment", tc.increment);
    localStorage.setItem("started", JSON.stringify(
      [...Array(o.players.length)].fill(false)));
    localStorage.setItem("score", "*");
    localStorage.setItem("started", JSON.stringify(
      [...Array(o.players.length)].fill(false)));
    localStorage.setItem("clocks", JSON.stringify(
      [...Array(o.players.length)].fill(0)));
    localStorage.setItem("mode", "live"); //function for live games only
  },

  // TODO: also option to takeback a move ?
  // NOTE: for live games only (all on server for corr)
  update: function(move, score) //game ID is not required
  {
    if (!!move)
    {
      let moves = JSON.parse(localStorage.getItem("moves"));
      moves.push(move);
      localStorage.setItem("moves", JSON.stringify(moves));
    }
    if (!!score)
      localStorage.setItem("score", score);
  },

  transferToDb: function()
  {
    // TODO: take finished game on localStorage and transfer it to indexedDB
  },

  // "computer mode" clearing is done through the menu
  clear: function()
  {
    localStorage.setItem("gameId", o.gameId);
    localStorage.setItem("vname", o.vname);
    // NOTE: when >= 3 players, better use an array + shuffle for mycolor
    const mycolor = (Math.random() < 0.5 ? "w" : "b");
    localStorage.setItem("mycolor", mycolor);
    localStorage.setItem("fenStart", o.fenStart);
    localStorage.setItem("fen", o.fenStart);
    localStorage.setItem("moves", JSON.stringify([]));
    // Shuffle players order (white then black then other colors).
    localStorage.setItem("players", JSON.stringify(shuffle(o.players)));
    // Extract times (in [milli]seconds), set clocks, store in localStorage
    const tc = extractTime(o.timeControl);
    localStorage.setItem("timeControl", o.timeControl);
    localStorage.setItem("clocks", JSON.stringify(
      [...Array(o.players.length)].fill(tc.mainTime)));
    localStorage.setItem("increment", tc.increment);
    localStorage.setItem("started", JSON.stringify(
      [...Array(o.players.length)].fill(false)));
    localStorage.setItem("score", "*");
    localStorage.setItem("started", JSON.stringify(
      [...Array(o.players.length)].fill(false)));
    localStorage.setItem("clocks", JSON.stringify(
      [...Array(o.players.length)].fill(0)));
    localStorage.setItem("mode", "live"); //function for live games only
    

    // TODO: refresh, and implement "transfert" function (to indexedDB)
    localStorage["myid"];
    localStorage["oppid"];
    delete localStorage["gameId"];
    delete localStorage["variant"];
    delete localStorage["mycolor"];
    delete localStorage["fenStart"];
    delete localStorage["moves"];
  },

  // TODO: game or gameInfo ?! --> when moves are played, it's a game, otherwise info
  get: function(gameRef)
  {
    const gid = gameRef.id;
    const rid = gameRef.rid; //may be blank
    let game = {};
    if (localStorage.getItem("gameId") === gid)
    {
      // Retrieve running game from localStorage
      game.score = localStorage.getItem("score");
      game.mycolor = localStorage.getItem("mycolor");
      game.fenStart = localStorage.getItem("fenStart");
      game.fen = localStorage.getItem("fen");
      game.moves = JSON.parse(localStorage.getItem("moves"));
      game.players = JSON.parse(localStorage.getItem("players"));
      game.started = JSON.parse(localStorage.getItem("started"));
      game.clocks = JSON.parse(localStorage.getItem("clocks"));
      game.timeControl = localStorage.getItem("timeControl");
      game.increment = localStorage.getItem("increment");
      game.vname = localStorage.getItem("vname");
      game.mode = "live";
    }
    else
    {
      // Find the game in indexedDB, on server or remotely: TODO
    }
    return game;
  },
};
