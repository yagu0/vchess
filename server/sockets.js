const url = require('url');
const VariantModel = require("./models/Variant");

// Node version in Ubuntu 16.04 does not know about URL class
function getJsonFromUrl(url)
{
	const query = url.substr(2); //starts with "/?"
	let result = {};
	query.split("&").forEach((part) => {
		const item = part.split("=");
		result[item[0]] = decodeURIComponent(item[1]);
	});
	return result;
}

// TODO: empêcher multi-log du même user (envoyer le user ID + secret en même temps que name et...)
// --> si secret ne matche pas celui trouvé en DB, stop

// TODO: this file in the end will be much simpler, just tracking connect/disconnect
// (everything else using WebRTC)

module.exports = function(wss) {
	VariantModel.getAll((err,variants) => {
		let clients = { "index": {} };
		let games = {}; //pending games (player sid)
		for (const v of variants)
			clients[v.id] = {};
		// No-op function as a callback when sending messages
		const noop = () => { };
		wss.on("connection", (socket, req) => {
//				const params = new URL("http://localhost" + req.url).searchParams;
//				const sid = params.get("sid");
//				const page = params.get("page");
			var query = getJsonFromUrl(req.url);
			const sid = query["sid"];
			const page = query["page"];
			// Ignore duplicate connections:
			if (!!clients[page][sid])
			{
				socket.send(JSON.stringify({code:"duplicate"}));
				return;
			}
			clients[page][sid] = socket;
			if (page == "index")
			{
				// Send counting info
				const countings = {};
				for (const v of variants)
					countings[v.id] = Object.keys(clients[v.id]).length;
				socket.send(JSON.stringify({code:"counts",counts:countings}));
			}
			else
			{
				// Send to every client connected on index an update message for counts
				Object.keys(clients["index"]).forEach( k => {
					clients["index"][k].send(
						JSON.stringify({code:"increase",vid:page}), noop);
				});
				// Also notify potential opponents:
				// hit all clients which check if sid corresponds
				Object.keys(clients[page]).forEach( k => {
					clients[page][k].send(JSON.stringify({code:"connect",id:sid}), noop);
				});
				socket.on("message", objtxt => {
					let obj = JSON.parse(objtxt);
					switch (obj.code)
					{
						case "newchat":
							if (!!clients[page][obj.oppid])
							{
								clients[page][obj.oppid].send(
									JSON.stringify({code:"newchat",msg:obj.msg}), noop);
							}
							break;
						case "newmove":
							if (!!clients[page][obj.oppid])
							{
								clients[page][obj.oppid].send(
									JSON.stringify({code:"newmove",move:obj.move}), noop);
							}
							break;
						case "ping":
							if (!!clients[page][obj.oppid])
								socket.send(JSON.stringify({code:"pong",gameId:obj.gameId}));
							break;
						case "myname":
							// Reveal my username to opponent
							if (!!clients[page][obj.oppid])
							{
								clients[page][obj.oppid].send(JSON.stringify({
									code:"oppname", name:obj.name}));
							}
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
								const gameId = games[page]["gameid"];
								delete games[page];
								const mycolor = (Math.random() < 0.5 ? 'w' : 'b');
								socket.send(JSON.stringify(
									{code:"newgame",fen:fen,oppid:oppId,color:mycolor,gameid:gameId}));
								if (!!clients[page][oppId])
								{
									clients[page][oppId].send(
										JSON.stringify(
											{code:"newgame",fen:fen,oppid:sid,color:mycolor=="w"?"b":"w",gameid:gameId}),
										noop);
								}
							}
							else
								games[page] = {id:sid, fen:obj.fen, gameid:obj.gameid}; //wait for opponent
							break;
						case "cancelnewgame": //if a user cancel his seek
							delete games[page];
							break;
						case "resign":
							if (!!clients[page][obj.oppid])
								clients[page][obj.oppid].send(JSON.stringify({code:"resign"}), noop);
							break;
						// TODO: case "challenge" (get ID) --> send to all, "acceptchallenge" (with ID) --> send to all, "cancelchallenge" --> send to all
						// also, "sendgame" (give current game info, if any) --> to new connections, "sendchallenges" (same for challenges) --> to new connections
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
						clients["index"][k].send(
							JSON.stringify({code:"decrease",vid:page}), noop);
					});
				}
				// Also notify potential opponents:
				// hit all clients which check if sid corresponds
				Object.keys(clients[page]).forEach( k => {
					clients[page][k].send(JSON.stringify({code:"disconnect",id:sid}), noop);
				});
			});
		});
	});
}
