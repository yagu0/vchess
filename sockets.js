//const url = require('url');
const Variants = require("./variants");

function getJsonFromUrl(url) {
	var query = url.substr(2); //starts with "/?"
	var result = {};
	query.split("&").forEach(function(part) {
		var item = part.split("=");
		result[item[0]] = decodeURIComponent(item[1]);
	});
	return result;
}

module.exports = function(wss) {

	let clients = { "index": {} };
	let games = {}; //pending games (player sid)
	for (const v of Variants)
		clients[v.name] = {};

	wss.on("connection", (socket, req) => {
		//const params = new URL("http://localhost" + req.url).searchParams;
		var query = getJsonFromUrl(req.url);
		const sid = query["sid"]; //params.get("sid");
		const page = query["page"]; //params.get("page");
		clients[page][sid] = socket;
		if (page == "index")
		{
			// Send counting info
			const countings = {};
			for (const v of Variants)
				countings[v.name] = Object.keys(clients[v.name]).length;
			socket.send(JSON.stringify({code:"counts",counts:countings}));
		}
		else
		{
			// Send to every client connected on index an update message for counts
			Object.keys(clients["index"]).forEach( k => {
				clients["index"][k].send(JSON.stringify({code:"increase",vname:page}));
			});
			// Also notify potential opponents: hit all clients which check if sid corresponds
			Object.keys(clients[page]).forEach( k => {
				clients[page][k].send(JSON.stringify({code:"connect",id:sid}));
			});
			socket.on("message", objtxt => {
				let obj = JSON.parse(objtxt);
				switch (obj.code)
				{
					case "newmove":
						// TODO: adjust with readyState? (+ setTimeout()?) + send opponent (re)disconnect
						// https://github.com/websockets/ws/blob/master/lib/websocket.js line 313
						if (!!clients[page][obj.oppid])
							clients[page][obj.oppid].send(JSON.stringify({code:"newmove",move:obj.move}));
						break;
					case "ping":
						if (!!clients[page][obj.oppid])
							socket.send(JSON.stringify({code:"pong"}));
						break;
					case "newgame":
						if (!!games[page])
						{
							// Start a new game
							const oppId = games[page]["id"];
							const fen = games[page]["fen"];
							delete games[page];
							const mycolor = Math.random() < 0.5 ? 'w' : 'b';
							socket.send(JSON.stringify({code:"newgame",fen:fen,oppid:oppId,color:mycolor}));
							// TODO: check readyState, potential setTimeout()? + send opponent (re)disconnect
							clients[page][oppId].send(JSON.stringify({code:"newgame",fen:fen,oppid:sid,color:mycolor=="w"?"b":"w"}));
						}
						else
							games[page] = {id:sid, fen:obj.fen}; //wait for opponent
						break;
					case "resign":
						clients[page][obj.oppid].send(JSON.stringify({code:"resign"}));
						break;
				}
			});
		}
		socket.on("close", () => {
			delete clients[page][sid];
			// Remove potential pending game
			if (!!games[page] && games[page]["id"] == sid)
				delete games[page];
			if (page != "index")
			{
				// Send to every client connected on index an update message for counts
				Object.keys(clients["index"]).forEach( k => {
					clients["index"][k].send(JSON.stringify({code:"decrease",vname:page}));
				});
			}
			// Also notify potential opponents: hit all clients which check if sid corresponds
			Object.keys(clients[page]).forEach( k => {
				clients[page][k].send(JSON.stringify({code:"disconnect",id:sid}));
			});
		});
	});
}
