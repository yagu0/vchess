new Vue({
	el: "#VueElement",
	data: {
		display: "", //default to main hall; see "created()" function
		gameRef: undefined, //...for now
		probId: undefined,
		conn: null,
		mode: "analyze",
		allowChat: false,
		allowMovelist: true,
		// Settings initialized with values from localStorage
		settings:	{
			bcolor: localStorage["bcolor"] || "lichess",
			sound: parseInt(localStorage["sound"]) || 2,
			hints: parseInt(localStorage["hints"]) || 1,
			coords: !!eval(localStorage["coords"]),
			highlight: !!eval(localStorage["highlight"]),
			sqSize: parseInt(localStorage["sqSize"]),
		},
	},
	created: function() {
		window.onhashchange = this.setDisplay;
		if (!!localStorage["variant"])
			location.hash = "#game?id=" + localStorage["gameId"];
		else
			this.setDisplay();
		// Our ID, always set (DB id if registered, collision-free random string otherwise)
		this.myid = user.id || localStorage["myid"] || "anon-" + getRandString();
		this.conn = new WebSocket(socketUrl + "/?sid=" + this.myid + "&page=" + variant.id);
		const socketCloseListener = () => {
			this.conn = new WebSocket(socketUrl + "/?sid=" + this.myid + "&page=" + variant.id);
		}
		this.conn.onclose = socketCloseListener;
	},
	methods: {
		// Game is over, clear storage and put it in indexedDB
		archiveGame: function() {
			// TODO: ...
			//clearStorage();
		},
		setDisplay: function() {
			// Prevent set display if there is a running game
			if (!!localStorage["variant"])
				return;
			if (!location.hash)
				location.hash = "#room"; //default
			const hashParts = location.hash.substr(1).split("?");
			this.display = hashParts[0];
			if (hashParts[0] == "problems" && !!hashParts[1])
			{
				// Show a specific problem
				this.probId = hashParts[1].split("=")[1];
			}
			else if (hashParts[0] == "game" && !!hashParts[1])
			{
				// Show a specific game, maybe with a user ID
				const params = hashParts[1].split("&").filter(h => h.split("=")[1]);
				// TODO: Vue.set(...) probably required here
				this.gameRef = {
					id: params[0],
					uid: params[1], //may be undefined
				};
			}
			// Close menu on small screens:
			let menuToggle = document.getElementById("drawer-control");
			if (!!menuToggle)
				menuToggle.checked = false;
		},
	},
});
