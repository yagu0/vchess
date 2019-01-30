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

  random: function(min, max)
  {
    if (!max)
    {
      max = min;
      min = 0;
    }
    return Math.floor(Math.random() * (max - min) ) + min;
  },

  // Inspired by https://github.com/jashkenas/underscore/blob/master/underscore.js
  sample: function(arr, n)
  {
    n = n || 1;
    let cpArr = arr.map(e => e);
    for (let index = 0; index < n; index++)
    {
      const rand = getRandInt(index, n);
      const temp = cpArr[index];
      cpArr[index] = cpArr[rand];
      cpArr[rand] = temp;
    }
    return cpArr.slice(0, n);
  },

  shuffle: function(arr)
  {
    return sample(arr, arr.length);
  },

  range: function(max)
  {
    return [...Array(max).keys()];
  },

  // TODO: rename into "cookie" et supprimer les deux ci-dessous
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
};
