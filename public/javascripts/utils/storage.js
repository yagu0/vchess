		// TODO: general methods to access/retrieve from storage, to be generalized
		// https://developer.mozilla.org/fr/docs/Web/API/API_IndexedDB
		// https://dexie.org/
		getStoragePrefix: function(mode) {
			let prefix = "";
			if (mode == "computer")
				prefix = "comp-";
			else if (mode == "friend")
				prefix = "anlz-";
			return prefix;
		},
		setStorage: function() {
			if (this.mode=="human")
			{
				localStorage.setItem("myid", this.myid);
				localStorage.setItem("oppid", this.oppid);
				localStorage.setItem("gameId", this.gameId);
			}
			const prefix = this.getStoragePrefix(this.mode);
			localStorage.setItem(prefix+"variant", variant);
			localStorage.setItem(prefix+"mycolor", this.mycolor);
			localStorage.setItem(prefix+"fenStart", this.fenStart);
			localStorage.setItem(prefix+"moves", JSON.stringify(this.vr.moves));
			localStorage.setItem(prefix+"fen", this.vr.getFen());
			localStorage.setItem(prefix+"score", "*");
		},
		updateStorage: function() {
			const prefix = this.getStoragePrefix(this.mode);
			localStorage.setItem(prefix+"moves", JSON.stringify(this.vr.moves));
			localStorage.setItem(prefix+"fen", this.vr.getFen());
			if (this.score != "*")
				localStorage.setItem(prefix+"score", this.score);
		},
		// "computer mode" clearing is done through the menu
		clearStorage: function() {
			if (this.mode == "human")
			{
				delete localStorage["myid"];
				delete localStorage["oppid"];
				delete localStorage["gameId"];
			}
			const prefix = this.getStoragePrefix(this.mode);
			delete localStorage[prefix+"variant"];
			delete localStorage[prefix+"mycolor"];
			delete localStorage[prefix+"fenStart"];
			delete localStorage[prefix+"moves"];
			delete localStorage[prefix+"fen"];
			delete localStorage[prefix+"score"];
		},
		clearCurrentGame: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			this.clearStorage();
			location.reload(); //to see clearing effects
		},

