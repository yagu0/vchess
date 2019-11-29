import params from "../parameters"; //for server URL

// TODO: replace by fetch API ?
// https://www.sitepoint.com/xmlhttprequest-vs-the-fetch-api-whats-best-for-ajax-in-2019/

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
export function ajax(url, method, data, success, error)
{
	let xhr = new XMLHttpRequest();
	if (data === undefined || typeof(data) === "function") //no data
	{
		error = success;
		success = data;
		data = {};
	}
  if (!success)
    success = () => {}; //by default, do nothing
	if (!error)
		error = errmsg => { alert(errmsg); };
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200)
		{
      let res_json = "";
			try {
				res_json = JSON.parse(xhr.responseText);
      } catch (e) {
				// Plain text (e.g. for rules retrieval)
				return success(xhr.responseText);
      }
      if (!res_json.errmsg && !res_json.errno)
        success(res_json);
			else
      {
        if (!!res_json.errmsg)
				  error(res_json.errmsg);
        else
          error(res_json.code + ". errno = " + res_json.errno);
      }
		}
	};

	if (["GET","DELETE"].includes(method) && !!data)
	{
		// Append query params to URL
		url += "/?" + toQueryString(data);
	}
	xhr.open(method, params.serverUrl + url, true);
	xhr.setRequestHeader('X-Requested-With', "XMLHttpRequest");
	// Next line to allow cross-domain cookies in dev mode (TODO: if...)
  if (params.cors)
    xhr.withCredentials = true;
  if (["POST","PUT"].includes(method))
	{
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify(data));
	}
	else
		xhr.send();
}
