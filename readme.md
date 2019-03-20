# Osiris and OJS

## OJS is an asynchronous Javascript template engine.
Designed to build static sites or be used with express.

## OJS Template syntax:
```javascript
<?
// we start our javascript content with <? and end it with ?>
// we can use <?= ?> to print a statement
// anything javascript goes, here's a test function
const myFunction = async () => { // async lets us await
  await print('<p>Hi from myFunction</p>'); // print is the only function available with OJS without Osiris
};
?>
<!DOCTYPE html>
<html>
<head>
  <title><?='Hi from Javascript!' ?></title>
</head>
<body>
<?
await print('<p>We must await our print statements</p>');
await print('<p>Everything is asynchronous here</p>');
await myFunction(); // we can await our own functions too
?>
</body>
</html>
```

## Osiris is a framework built on top of OJS
Designed to facility code re-use and organisation of files

- [Example build script](https://github.com/seam-project-studios/osiris-ojs/blob/master/build.js)
- [Example build and host static](https://github.com/seam-project-studios/osiris-ojs/blob/master/static.js)
- [Example express hook](https://github.com/seam-project-studios/osiris-ojs/blob/master/dev.js)

## Osiris build example
```javascript
const osiris = require('osiris-ojs'); // renderer

// we can inject things into scope to be used by all renderings
osiris.use({
  aGlobalFunction: async () => {
    await this.print('Hi from aGlobalFunction');
  }
});

let writeFile = fs.createWriteStream('myBuilt.html');
await osiris.render(writeFile, 'myToBuild.ojs', {
  myLocalFunction: async () => { // we can inject things just for this rendering
    await this.print('Hi from myLocalFunction');
  }
});
```

## Osiris API
Osiris exposes the following functions to the templates, as well as the default `print()` provided by OJS
- `q: async? (str='')`, translates a strings HTML entities so it can be used within quoted attributes, returns a promise if given a promise
- `snippet: async (filename, args)`, renders filename found in src/snippets/`filename`.ojs with the arguments provided as `args` to the template
- `element: async (filename, args)`, renders filename found in src/elements/`filename`.ojs with the arguments provided as `args` to the template
- `js: (str)`, bundles collections of Javascript for footer insertion
- `css: (str)`, bundles collections of CSS for footer insertion
- `bundleJs`, retrieves the JS bundle for output
- `bundleCss`, retrieves the CSS bundle for output

## Osiris express
Osiris comes with hooks to get functionality within express, usage:
```javascript
const HTTP_PORT = 8080;
const osiris = require('osiris-ojs');
const ojsExpress = require('osiris-ojs/express');
const express = require('express');
const app = express();
const fs = require('mz/fs'); // modernizer fs uses promises instead of callbacks

const main = async () => {
  app.use(async (req, res, next) => {
    let filename = req.path.substr(1); // trim starting /

    if (filename === '') {
      filename = 'index'; // default page for directory index
    }

    if (!await fs.exists('./src/pages/' + filename + '.ojs')) {
      return next(); // file doesn't exist, bail
    }

    res.header('content-type', 'text/html'); // we have something

    // call renderer with our addons, we can block here with await if we need any clean up after render
    await osiris.render(
      res, // our writableStream
      './src/pages/' + filename + '.ojs', // our template file
      ojsExpress(req, res), // this gives templates access to get, post, header() and headersSent, cookie and setCookie()
      express: ojsExpress(req, res) // we can also do this if we want to put all of that in scope of an express object instead of top level
    });
    // render complete, res.end() sent, clean up
  });
  await app.listen(HTTP_PORT);
  console.log('Node process listening on ' + HTTP_PORT);
};

main();
```
## Osiris express template API
- `get`, object containing get variables, parsed by `url.parse`
- `post`, object containing post variables, taken from `req.body`
- `header: (...args)`, calls `res.header`
- `headersSent`, boolean if headers have been sent yet
- `cookie`, object containing cookie variables, taken from `req.cookies`
- `setCookie: (...args)`, calls `res.cookie`

## Osiris i18n
Designed to facilitate internationalisation of HTML templates.  It does this by JIT searching the src/locales/ folder for folders for each locale, then searches within those for translations

Example as before but with:
```javascript
const ojsi18n = await require('osiris-ojs/i18n')(); // searches for locales and exposes nodeJS API

await osiris.render(writeFile, file, {
  i18n: ojsi18n.locale(locale), // locale being the viewers current locale, exposes: t(), d(), n(), locale, locales, setLocale()
});
```

More complete examples in [Example express hook](https://github.com/seam-project-studios/osiris-ojs/blob/master/dev.js) and [Example build script](https://github.com/seam-project-studios/osiris-ojs/blob/master/build.js)

## Osiris nodeJS API
- `locales`, array of strings of locales available
- `locale: (localeString)`, returns template API for `localeString`

## Osiris i18n template API
- `locale`, string of current locale
- `setLocale: (localeString)`, sets the locale for the current request
- `locales`, array containing string of all available locales
- `t: async (namespaceString)`, splits the namespaceString by "." and recurses down src/locales/`locale`/ folders/JSON structures (JS and JSON files supported) until a valid key is found. if a function is found it is called (async), returns "[locale.`locale`.`namespaceString`]" on failure
- `d: (dateObject, options?)`, localize datetime according to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
- `n: (numberObject, options?)`, localize number according to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat
