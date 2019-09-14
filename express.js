const url = require('url'); // parse query strings

const AtjsExpress = function(req, res) {
  // private variables
  const getVars = url.parse(req.url, true).query;
  const postVars = req.body || {};
  const cookieVars = req.cookies || {};

  // exposed function
  this.header = (...args) => {
    res.set(...args);
    return '';
  };

  this.redirect = (...args) => {
    res.redirect(...args);
    return '';
  };

  this.setCookie = (...args) => {
    res.cookie(...args);
    return '';
  };

  // exposed variables
  Object.defineProperties(this, {
    get: { enumerable: true, value: getVars },
    post: { enumerable: true, value: postVars },
    cookie: { enumerable: true, value: cookieVars },
    headersSent: { enumerable: true, get: () => res.headersSent }, // ensure we get the live value
  });
};

module.exports = (req, res) => new AtjsExpress(req, res);
