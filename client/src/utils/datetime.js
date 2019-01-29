function zeroPad(x)
{
	return (x<10 ? "0" : "") + x;
}

export function getDate(d)
{
	return d.getFullYear() + '-' + zeroPad(d.getMonth()+1) + '-' + zeroPad(d.getDate());
}

export function getTime(d)
{
	return zeroPad(d.getHours()) + ":" + zeroPad(d.getMinutes()) + ":" +
		zeroPad(d.getSeconds());
}
