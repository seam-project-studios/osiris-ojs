# Osiris and OJS

## OJS is an asyncronous Javascript template engine.
Designed to build static sites or be used with express.

Basic template syntax:
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
await print('<p>Everything is asyncronous here</p>');
await myFunction(); // we can await our own functions too
?>
</body>
</html>
```

## Osiris is a framework built on top of OJS
Designed to facility code re-use and organisation of files

[Example build script](https://github.com/seam-project-studios/osiris-ojs/blob/master/build.js)

[Example build and host static](https://github.com/seam-project-studios/osiris-ojs/blob/master/static.js)

[Example express hook](https://github.com/seam-project-studios/osiris-ojs/blob/master/dev.js)

## Basic Osiris build example
```javascript
const osiris = require('./osiris'); // renderer

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