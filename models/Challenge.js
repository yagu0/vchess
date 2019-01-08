var db = require("../utils/database");

/*
 * Structure:
 *   _id: BSON id
 *   vid: variant ID
 *   from: player ID
 *   to: player ID, undefined if automatch
 */

exports.create = function(vid, from, to, callback)
{
	let chall = {
		"vid": vid,
		"from": from
	};
	if (!!to)
		chall.to = to;
	db.challenges.insert(chall, callback);
}

//////////
// GETTERS

exports.getById = function(cid, callback)
{
	db.challenges.findOne({_id: cid}, callback);
}

// For index page: obtain challenges that the player can accept
exports.getByPlayer = function(uid, callback)
{
	db.challenges.aggregate(
		{$match: {$or: [
			{"to": uid},
			{$and: [{"from": {$ne: uid}}, {"to": {$exists: false}}]}
		]}},
		{$project: {_id:0, vid:1}},
		{$group: {_id:"$vid", count:{$sum:1}}},
		callback);
}

// For variant page (challenges related to a player)
exports.getByVariant = function(uid, vid, callback)
{
	db.challenges.find({$and: [
		{"vid": vid},
		{$or: [
			{"to": uid},
			{"from": uid},
			{"to": {$exists: false}},
		]}
	]}, callback);
}

//////////
// REMOVAL

exports.remove = function(cid, callback)
{
	db.challenges.remove({_id: cid}, callback);
}

// Remove challenges older than 1 month, and 1to1 older than 36h
exports.removeOld = function()
{
	var tsNow = new Date().getTime();
	// 86400000 = 24 hours in milliseconds
	var day = 86400000;
	db.challenges.find({}, (err,challengeArray) => {
		challengeArray.forEach( c => {
			if (c._id.getTimestamp() + 30*day < tsNow //automatch
				|| (!!c.to && c._id.getTimestamp() + 1.5*day < tsNow)) //1 to 1
			{
				db.challenges.remove({"_id": c._id});
			}
		});
	});
}
