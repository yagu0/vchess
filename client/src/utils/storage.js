// TODO: general methods to access/retrieve from storage, to be generalized
// https://developer.mozilla.org/fr/docs/Web/API/API_IndexedDB
// https://dexie.org/

export const GameStorage =
{
  init: function(myid, oppid, gameId, variant, mycolor, fenStart)
  {
    localStorage.setItem("myid", myid);
    localStorage.setItem("gameId", gameId);
    localStorage.setItem("vname", variant);
    localStorage.setItem("mycolor", mycolor);
    localStorage.setItem("fenStart", fenStart);
    localStorage.setItem("moves", []);
  },

  // TODO: also option to takeback a move ?
  update: function(move)
  {
    let moves = JSON.parse(localStorage.getItem("moves"));
    moves.push(move);
    localStorage.setItem("moves", JSON.stringify(moves));
  },

  // "computer mode" clearing is done through the menu
  clear: function()
  {
    // TODO: refresh, and implement "transfert" function (to indexedDB)
    delete localStorage["myid"];
    delete localStorage["oppid"];
    delete localStorage["gameId"];
    delete localStorage["variant"];
    delete localStorage["mycolor"];
    delete localStorage["fenStart"];
    delete localStorage["moves"];
  },

  // TODO: game or gameInfo ?!
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
