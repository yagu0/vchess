const url = require('url');
const Variants = require("./variants");

module.exports = function(wss) {

	let clients = { "index": {} };
	let games = {}; //pending games (player sid)
	for (const v of Variants)
		clients[v.name] = {};

//	// Safety counter (TODO: is it necessary ?)
//	setInterval(() => {
//		Object.keys(clients).forEach(k => {
//			Object.keys(clients[k]).forEach(ck => {
//				if (!clients[k][ck] || clients[k][ck].readyState != 1)
//					delete clients[k][ck];
//			});
//		});
//	}, 60000); //every minute (will be lowered if a lot of users...)

	// No-op function as a callback when sending messages
	const noop = () => { };

	wss.on("connection", (socket, req) => {
		const params = new URL("http://localhost" + req.url).searchParams;
		const sid = params.get("sid");
		const page = params.get("page");
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
				clients["index"][k].send(JSON.stringify({code:"increase",vname:page}), noop);
			});
			// Also notify potential opponents: hit all clients which check if sid corresponds
			Object.keys(clients[page]).forEach( k => {
				clients[page][k].send(JSON.stringify({code:"connect",id:sid}), noop);
			});
			socket.on("message", objtxt => {
				let obj = JSON.parse(objtxt);
				switch (obj.code)
				{
					case "newmove":
						if (!!clients[page][obj.oppid])
						{
							clients[page][obj.oppid].send(
								JSON.stringify({code:"newmove",move:obj.move}), noop);
						}
						break;
					case "ping":
						if (!!clients[page][obj.oppid])
							socket.send(JSON.stringify({code:"pong"}));
						break;
					case "lastate":
						if (!!clients[page][obj.oppid])
						{
							const oppId = obj.oppid;
							obj.oppid = sid; //I'm oppid for my opponent
							clients[page][oppId].send(JSON.stringify(obj), noop);
						}
						break;
					case "newgame":
						if (!!games[page])
						{
							// Start a new game
							const oppId = games[page]["id"];
							const fen = games[page]["fen"];
							delete games[page];
							const mycolor = Math.random() < 0.5 ? 'w' : 'b';
							socket.send(
								JSON.stringify({code:"newgame",fen:fen,oppid:oppId,color:mycolor}));
							if (!!clients[page][oppId])
							{
								clients[page][oppId].send(
									JSON.stringify(
										{code:"newgame",fen:fen,oppid:sid,color:mycolor=="w"?"b":"w"}),
									noop);
							}
						}
						else
							games[page] = {id:sid, fen:obj.fen}; //wait for opponent
						break;
					case "cancelnewgame": //if a user cancel his seek
						delete games[page];
						break;
					case "resign":
						if (!!clients[page][obj.oppid])
							clients[page][obj.oppid].send(JSON.stringify({code:"resign"}), noop);
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
					clients["index"][k].send(JSON.stringify({code:"decrease",vname:page}), noop);
				});
			}
			// Also notify potential opponents: hit all clients which check if sid corresponds
			Object.keys(clients[page]).forEach( k => {
				clients[page][k].send(JSON.stringify({code:"disconnect",id:sid}), noop);
			});
		});
	});
}
