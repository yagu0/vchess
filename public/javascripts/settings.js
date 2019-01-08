// TODO:
//à chaque onChange, envoyer matching event settings update
//(par exemple si mise à jour du nom, juste envoyer cet update aux autres connectés ...etc)
		setMyname: function(e) {
			this.myname = e.target.value;
			localStorage["username"] = this.myname;
		},
		showSettings: function(e) {
			this.getRidOfTooltip(e.currentTarget);
			document.getElementById("modal-settings").checked = true;
		},
		toggleHints: function() {
			this.hints = !this.hints;
			localStorage["hints"] = (this.hints ? "1" : "0");
		},
		setBoardColor: function(e) {
			this.bcolor = e.target.options[e.target.selectedIndex].value;
			localStorage["bcolor"] = this.bcolor;
		},
		setSound: function(e) {
			this.sound = parseInt(e.target.options[e.target.selectedIndex].value);
			localStorage["sound"] = this.sound;
		},
