new Vue({
	el: "#VueElement",
	data: {
		display: "", //default to main hall; see "created()" function
		gameid: undefined, //...yet
		queryHash: "",
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
		if (!!localStorage["variant"])
		{
			location.hash = "#game?id=" + localStorage["gameId"];
			this.display = location.hash.substr(1);
		}
		else
			this.setDisplay();
		window.onhashchange = this.setDisplay;
		// Our ID, always set (DB id if registered, collision-free random string otherwise)
		this.myid = user.id || localStorage["myid"] || "anon-" + getRandString();
		this.conn = new WebSocket(socketUrl + "/?sid=" + this.myid + "&page=" + variant.id);
		const socketCloseListener = () => {
			this.conn = new WebSocket(socketUrl + "/?sid=" + this.myid + "&page=" + variant.id);
		}
		this.conn.onclose = socketCloseListener;
	},
	methods: {
		updateSettings: function(event) {
			const propName =
				event.target.id.substr(3).replace(/^\w/, c => c.toLowerCase())
			localStorage[propName] = ["highlight","coords"].includes(propName)
				? event.target.checked
				: event.target.value;
		},
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
			this.queryHash = hashParts[1]; //may be empty, undefined...
			// Close menu on small screens:
			let menuToggle = document.getElementById("drawer-control");
			if (!!menuToggle)
				menuToggle.checked = false;
		},
	},
});
