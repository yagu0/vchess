import params from "../parameters"; //for server URL
import { store } from "../store"; //for translations

// From JSON (encoded string values!) to "arg1=...&arg2=..."
function toQueryString(data) {
  let data_str = "";
  Object.keys(data).forEach(k => {
    data_str += k + "=" + encodeURIComponent(data[k]) + "&";
  });
  return data_str.slice(0, -1); //remove last "&"
}

// TODO: use this syntax https://stackoverflow.com/a/29823632 ?
// data, success, error: optional
export function ajax(url, method, options) {
  const data = options.data || {};
  // By default, do nothing on success and print errors:
  if (!options.success)
    options.success = () => {};
  if (!options.error) {
    options.error = (errmsg) => {
      alert(store.state.tr[errmsg] || errmsg);
    };
  }
  if (["GET", "DELETE"].includes(method) && !!data)
    // Append query params to URL
    url += "/?" + toQueryString(data);
  const headers = {
    "Content-Type": "application/json;charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest"
  };
  let fetchOptions = {
    method: method,
    headers: headers,
  };
  if (["POST", "PUT"].includes(method))
    fetchOptions["body"] = JSON.stringify(data);
  if (
    !!options.credentials ||
    (method != "GET" && !options.nocredentials)
  ) {
    fetchOptions["credentials"] = params.credentials;
  }
  fetch(params.serverUrl + url, fetchOptions)
  .then(res => res.json())
  .then(json => {
    if (!json.errmsg && !json.errno) options.success(json);
    else {
      if (!!json.errmsg) options.error(json.errmsg);
      else options.error(json.code + ". errno = " + json.errno);
    }
  });
}
