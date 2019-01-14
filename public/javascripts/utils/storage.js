// TODO: general methods to access/retrieve from storage, to be generalized
// https://developer.mozilla.org/fr/docs/Web/API/API_IndexedDB
// https://dexie.org/

function setStorage(myid, oppid, gameId, variant, mycolor, fenStart)
{
	localStorage.setItem("myid", myid);
	localStorage.setItem("oppid", oppid);
	localStorage.setItem("gameId", gameId);
	localStorage.setItem("variant", variant);
	localStorage.setItem("mycolor", mycolor);
	localStorage.setItem("fenStart", fenStart);
	localStorage.setItem("moves", []);
}

function updateStorage(move)
{
	let moves = JSON.parse(localStorage.getItem("moves"));
	moves.push(move);
	localStorage.setItem("moves", JSON.stringify(moves));
}

// "computer mode" clearing is done through the menu
function clearStorage()
{
	delete localStorage["myid"];
	delete localStorage["oppid"];
	delete localStorage["gameId"];
	delete localStorage["variant"];
	delete localStorage["mycolor"];
	delete localStorage["fenStart"];
	delete localStorage["moves"];
}

function getGameFromStorage(gameId)
{
	let game = {};
	if (localStorage.getItem("gameId") === gameId)
	{
		// Retrieve running game from localStorage
		game.score = localStorage.getItem("score");
		game.oppid = localStorage.getItem("oppid");
		game.mycolor = localStorage.getItem("mycolor");
		game.fenStart = localStorage.getItem("fenStart");
		game.moves = localStorage.getItem("moves");
	}
	else
	{
		// Find the game in indexedDB: TODO
	}
}
