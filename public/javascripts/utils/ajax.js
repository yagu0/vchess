// From JSON (encoded string values!) to "arg1=...&arg2=..."
function toQueryString(data)
{
	let data_str = "";
	Object.keys(data).forEach(k => {
		data_str += k + "=" + encodeURIComponent(data[k]) + "&";
	});
	return data_str.slice(0, -1); //remove last "&"
}

// data, error: optional
function ajax(url, method, data, success, error)
{
	let xhr = new XMLHttpRequest();
	if (typeof(data) === "function") //no data
	{
		error = success;
		success = data;
		data = {};
	}
	if (!error)
		error = errmsg => { alert(errmsg); };

	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200)
		{
			try {
				let res_json = JSON.parse(xhr.responseText);
				if (!res_json.errmsg)
					success(res_json);
				else
					error(res_json.errmsg);
			} catch (e) {
				// Plain text (e.g. for rules retrieval)
				success(xhr.responseText);
			}
		}
	};

	if (["GET","DELETE"].includes(method) && !!data)
	{
		// Append query params to URL
		url += "/?" + toQueryString(data);
	}

	xhr.open(method, url, true);
	xhr.setRequestHeader('X-Requested-With', "XMLHttpRequest");
	if (["POST","PUT"].includes(method))
	{
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify(data));
	}
	else
		xhr.send();
}
