// Load rules on variant page
Vue.component('my-rules', {
	data: function() {
		return { content: "" };
	},
	template: `<div v-html="content" class="section-content"></div>`,
	mounted: function() {
		// AJAX request to get rules content (plain text, HTML)
		let xhr = new XMLHttpRequest();
		let self = this;
		xhr.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200)
			{
				let replaceByDiag = (match, p1, p2) => { return self.drawDiag(p2); };
				self.content = xhr.responseText.replace(/(fen:)([^:]*):/g, replaceByDiag);
			}
		};
		xhr.open("GET", "/rules/" + variant, true);
		xhr.setRequestHeader('X-Requested-With', "XMLHttpRequest");
		xhr.send();
	},
	methods: {
		drawDiag: function(fen) {
			let [sizeX,sizeY] = VariantRules.size;
			let fenParts = fen.split(" ");
			// Obtain array of pieces images names
			let board = VariantRules.GetBoard(fenParts[0]);
			let orientation = "w";
			if (fenParts.length >= 2)
				orientation = fenParts[1];
			let markArray = [];
			if (fenParts.length >= 3)
			{
				let marks_str = fenParts[2];
				// Turn (human) marks into coordinates
				markArray = doubleArray(sizeX, sizeY, false);
				let marks = marks_str.split(",");
				for (let i=0; i<marks.length; i++)
				{
					var res = /^([a-z]+)([0-9]+)$/i.exec(marks[i]);
					let x = sizeX - parseInt(res[2]); //white at bottom, so counting is reversed
					let y = res[1].charCodeAt(0)-97; //always one char: max 26, big enough
					markArray[x][y] = true;
				}
			}
			let boardDiv = "";
			let [startX,startY,inc] = orientation == 'w'
				? [0, 0, 1]
				: [sizeX-1, sizeY-1, -1];
			for (let i=startX; i>=0 && i<sizeX; i+=inc)
			{
				boardDiv += "<div class='row'>";
				for (let j=startY; j>=0 && j<sizeY; j+=inc)
				{
					boardDiv += "<div class='board board" + sizeY + " " +
						((i+j)%2==0 ? "light-square-diag" : "dark-square-diag") + "'>";
					if (markArray.length>0 && markArray[i][j])
						boardDiv += "<img src='/images/mark.svg' class='markSquare'/>";
					if (board[i][j] != VariantRules.EMPTY)
					{
						boardDiv += "<img src='/images/pieces/" +
							VariantRules.getPpath(board[i][j]) + ".svg' class='piece'/>";
					}
					boardDiv += "</div>";
				}
				boardDiv += "</div>";
			}
			return boardDiv;
		},
	},
})
