const url = require('url'); // parse query strings

const OjsExpress = function(req, res) {
  // private variables
  const getVars = url.parse(req.url, true).query || {};
  const postVars = req.body || {};
  const headerSent = false;

  // exposed function
  this.header = (headerString) => {
    headerSent = true;
    return res.header(headerString);
  };

  // exposed variables
  Object.defineProperties(this, {
    get: { enumerable: true, value: getVars },
    post: { enumerable: true, value: postVars },
    headerSent: { enumerable: true, get: () => headerSent }, // ensure we get the live value
  });
};

module.exports = (...args) => new OjsExpress(...args);
