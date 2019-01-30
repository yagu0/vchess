// Source: https://www.quirksmode.org/js/cookies.html
export function setCookie(name, value)
{
  var date = new Date();
  date.setTime(date.getTime()+(183*24*60*60*1000)); //6 months
  var expires = "; expires="+date.toGMTString();
  document.cookie = name+"="+value+expires+"; path=/";
}

export function getCookie(name, defaut) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for (var i=0;i < ca.length;i++)
  {
    var c = ca[i];
    while (c.charAt(0)==' ')
      c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0)
      return c.substring(nameEQ.length,c.length);
  }
  return defaut; //cookie not found
}
