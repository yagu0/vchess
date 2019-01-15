new Vue({
	el: "#VueElement",
	data: {
		display: "undefined", //default to main hall; see "created()" function
		gameid: undefined, //...yet
		queryHash: "",
		conn: null,

		// Settings initialized with values from localStorage
		settings:	{
			bcolor: localStorage["bcolor"] || "lichess",
			sound: parseInt(localStorage["sound"]) || 2,
			hints: parseInt(localStorage["hints"]) || 1,
			coords: !!eval(localStorage["coords"]),
			highlight: !!eval(localStorage["highlight"]),
			sqSize: parseInt(localStorage["sqSize"]),
		},

		// TEMPORARY: DEBUG
		mode: "analyze",
		orientation: "w",
		userColor: "w",
		allowChat: false,
		allowMovelist: true,
		fen: V.GenRandInitFen(),
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
		this.myid = "abcdefghij";
//console.log(this.myid + " " + variant);
			//myid: localStorage.getItem("myid"), //our ID, always set

		this.conn = new WebSocket(socketUrl + "/?sid=" + this.myid + "&page=" + variant.id);
		const socketCloseListener = () => {
			this.conn = new WebSocket(socketUrl + "/?sid=" + this.myid + "&page=" + variant.id);
		}
		this.conn.onclose = socketCloseListener;

		//this.vr = new VariantRules( V.GenRandInitFen() );
	},
	methods: {
		updateSettings: function(event) {
			const propName =
				event.target.id.substr(3).replace(/^\w/, c => c.toLowerCase())
			localStorage[propName] = ["highlight","coords"].includes(propName)
				? event.target.checked
				: event.target.value;
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
		
//const continuation = (localStorage.getItem("variant") === variant.name);
//			if (continuation) //game VS human has priority
//				this.continueGame("human");
