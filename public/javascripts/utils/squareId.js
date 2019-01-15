// Get the identifier of a HTML square from its numeric coordinates o.x,o.y.
function getSquareId(o)
{
	// NOTE: a separator is required to allow any size of board
	return  "sq-" + o.x + "-" + o.y;
}

// Inverse function
function getSquareFromId(id) {
	let idParts = id.split('-');
	return [parseInt(idParts[1]), parseInt(idParts[2])];
}
