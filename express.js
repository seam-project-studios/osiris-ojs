const url = require('url'); // parse query strings

const OjsExpress = function(req, res) {
  const getVars = url.parse(req.url, true).query || {};
  const postVars = req.body || {};
  const headerSent = false;

  this.header = (headerString) => {
    headerSent = true;
    return res.header(headerString);
  };

  Object.defineProperties(this, {
    get: {
      value: getVars,
      configurable: false,
      enumerable: true,
      writable: false,
    },
    post: {
      value: postVars,
      configurable: false,
      enumerable: true,
      writable: false,
    },
    headerSent: {
      get: () => headerSent, // ensure we get the live value
      configurable: false,
      enumerable: true,
    },
  });
};

module.exports = (...args) => new OjsExpress(...args);
