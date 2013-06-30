// fake storage
var sockets = {};
var cookies = {};
var emails = {};

exports.mapCookieToEmail = function(cookie, email) {
  emails[cookie] = email;
};

exports.getEmailFromCookie = function(cookie) {
  return emails[cookie];
};

exports.mapEmailToSocketID = function(email, socketid) {
  sockets[email] = socketid;
};

exports.getSocketIDFromEmail = function(email) {
  return sockets[email];
};

exports.mapSocketIDToCookie = function(socketid, cookie) {
  cookies[socketid] = cookie;
};

exports.getCookieFromSocketID = function(socketid) {
  return cookies[socketid];
};
