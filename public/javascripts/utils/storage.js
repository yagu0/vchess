		// TODO: general methods to access/retrieve from storage, to be generalized
		// https://developer.mozilla.org/fr/docs/Web/API/API_IndexedDB
		// https://dexie.org/
		setStorage: function(myid, oppid, gameId, variant, mycolor, fenStart) {
			localStorage.setItem("myid", myid);
			localStorage.setItem("oppid", oppid);
			localStorage.setItem("gameId", gameId);
			localStorage.setItem("variant", variant);
			localStorage.setItem("mycolor", mycolor);
			localStorage.setItem("fenStart", fenStart);
			localStorage.setItem("moves", []);
		},
		updateStorage: function(move) {
			let moves = JSON.parse(localStorage.getItem("moves"));
			moves.push(move);
			localStorage.setItem("moves", JSON.stringify(moves));
		},
		// "computer mode" clearing is done through the menu
		clearStorage: function() {
			delete localStorage["myid"];
			delete localStorage["oppid"];
			delete localStorage["gameId"];
			delete localStorage["variant"];
			delete localStorage["mycolor"];
			delete localStorage["fenStart"];
			delete localStorage["moves"];
		},
