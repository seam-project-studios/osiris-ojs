const HTTP_PORT = process.env.HTTP_PORT || 4683;

const CMSPage = function ({
  heading = '',
  description = '',
  links = null, fields = []
}) {
  this.heading = heading;
  this.description = description;
  this.links = links;
  this.fields = fields;
};

CMSField = function ({
  file = '',
  path = '',
  element = 'input',
  args = {}
}) {
  this.file = file;
  this.path = path;
  this.element = element;
  this.args = args;
};

module.exports = {
  CMSPage, CMSField
};

const main = async () => {
  // general purpose
  const fs = require('mz/fs'); // modernizer fs uses promises instead of callbacks

  // express engine
  const express = require('express');
  const app = express();

  // parse post data into req.body
  const bodyParser = require('body-parser');
  app.use(bodyParser.urlencoded({ extended: false }));

  // parse cookies into req.cookies
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  // our render engine
  const osiris = require('./osiris');
  osiris.mode = 'development';

  // our template addons
  const atjsExpress = require('./express');
  const atjsi18n = await require('./i18n')();
  atjsi18n.watch(); // watch localeFolder for changes

  app.use(async (req, res, next) => {
    let filename = req.path.substr(1); // trim starting /

    if (filename === '') {
      filename = 'index'; // default page for directory index
    }

    if (!await fs.exists('./src/cms/' + filename + '.js')) {
      return next(); // file doesn't exist, bail
    }
    const cms = require('./src/cms/' + filename + '.js');

    res.header('content-type', 'text/html');

    let saved = false;
    if (Object.keys(req.body) && cms.fields.length) {
      // potential something to save
      let newData = {}; // [file][path] = value
      for (field of cms.fields) {
        let val = req.body[field.file + '#' + field.path];
        if (typeof val !== 'undefined') {
          if (!newData[field.file]) newData[field.file] = {};
          newData[field.file][field.path] = val;
        }
      }

      // save
      for (let file of Object.keys(newData)) {
        saved = true;
        let oldData = {};
        if (await fs.exists('./src/locales/en-GB/' + file + '.json')) {
          oldData = JSON.parse(await fs.readFile('./src/locales/en-GB/' + file + '.json'));
        }
        await fs.writeFile('./src/locales/en-GB/' + file + '.json', JSON.stringify(resolveData(oldData, newData[file]), null, '  '));
      }
    }

    let uid = 0;
    await osiris.render(res, './src/pages/cms.atjs', {
      cms, saved,
      express: atjsExpress(req, res),
      atjsi18n: atjsi18n,
      UID: () => ++uid,
    });
  });

  await app.listen(HTTP_PORT, () => {
    console.log('CMS process listening on ' + HTTP_PORT);
  });
};
if (require.main === module) main();

// traverse the newDatas keys as dot paths and insert the value, return the new structure
const resolveData = function(oldData, newData) {
  let ret = { ...oldData }; // copy
  for (let key of Object.keys(newData)) {
    let val = newData[key];
    let p = key.split('.');
    let ref = ret;
    while (p.length > 1) { // loop until last key
      let k = p.shift();
      if (typeof ref[k] === 'undefined') ref[k] = {}; // nothing there, create empty object
      ref = ref[k]; // move our reference down the tree
    }
    ref[p[0]] = val; // last key for the value
  }
  return ret;
};