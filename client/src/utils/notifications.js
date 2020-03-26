// https://developer.mozilla.org/en-US/docs/Web/API/notification
export function notify(title, options) {
  if (Notification.permission === "granted")
    new Notification(title, options);
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission(function (permission) {
      if(!('permission' in Notification))
        Notification.permission = permission;
      if (permission === "granted")
        var notification = new Notification(title, options);
    });
  }
}
