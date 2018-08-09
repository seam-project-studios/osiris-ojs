const url = require('url'); // parse query strings

const OjsExpress = function(req, res) {
  // private variables
  const getVars = url.parse(req.url, true).query;
  const postVars = req.body;

  // exposed function
  this.header = (...args) => {
    res.header(...args);
    return '';
  };

  // exposed variables
  Object.defineProperties(this, {
    get: { enumerable: true, value: getVars },
    post: { enumerable: true, value: postVars },
    headersSent: { enumerable: true, get: () => res.headersSent }, // ensure we get the live value
  });
};

module.exports = (...args) => new OjsExpress(...args);
