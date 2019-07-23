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
  i18n = '',
  element = 'input',
  args = {}
}) {
  this.i18n = i18n;
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
  const ojsExpress = require('./express');
  const ojsi18n = await require('./i18n')();
  ojsi18n.watch(); // watch localeFolder for changes

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

    if (Object.keys(req.body) && cms.fields) {
      for (field of cms.fields) {
        if (req.body[field.i18n]) {
          console.log(field.i18n + ' = ' + req.body[field.i18n]);
        }
      }
    }

    // call renderer with our addons, we can block here with await if we need any clean up after render
    let uid = 0;
    await osiris.render(res, './src/pages/cms.ojs', {
      cms,
      express: ojsExpress(req, res),
      ojsi18n: ojsi18n,
      UID: () => ++uid,
    });
    // render complete, res.end() sent, clean up
  });

  await app.listen(HTTP_PORT, () => {
    console.log('CMS process listening on ' + HTTP_PORT);
  });
};
if (require.main === module) main();
