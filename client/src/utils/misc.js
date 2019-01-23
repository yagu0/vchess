export const util =
{
  // Source: https://www.quirksmode.org/js/cookies.html
  setCookie: function(name, value)
  {
    var date = new Date();
    date.setTime(date.getTime()+(183*24*60*60*1000)); //6 months
    var expires = "; expires="+date.toGMTString();
    document.cookie = name+"="+value+expires+"; path=/";
  },

  getCookie: function(name, defaut) {
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
  },

  // Random (enough) string for socket and game IDs
  getRandString: function()
  {
    return (Date.now().toString(36) + Math.random().toString(36).substr(2, 7))
      .toUpperCase();
  },

  // Shortcut for an often used click (on a modal)
  doClick: function(elemId)
  {
    document.getElementById(elemId).click(); //or ".checked = true"
  },

  translate: function(msg)
  {
    return translations[msg];
  },
};
