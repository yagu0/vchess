// Remove item in array (if present)
var removeItem = function(array, rfun)
{
	let index = array.findIndex(rfun);
	if (index >= 0)
		array.splice(index, 1);
}

// Remove several item matching a condition
var removeMultiple = function(array, rfun)
{
	// Reverse loop because of the splice below
	for (let i=array.length-1; i>=0; i--)
	{
		if (rfun(array[i]))
			array.splice(i, 1);
	}
}

// Double array intialization
var doubleArray = function(size1, size2, initElem)
{
	return _.map(_.range(size1), () => {
		return _.map(_.range(size2), () => {
			return initElem; //can be undefined
		})
	});
}

var copyDoubleArray = function(arr)
{
	return _.map(_.range(arr.length), (el1,i) => {
		return _.map(_.range(arr[0].length), (el2,j) => {
			return arr[i][j];
		})
	});
}
