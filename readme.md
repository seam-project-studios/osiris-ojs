# Osiris and OJS

## OJS is an asyncronous Javascript template engine.
Designed to build static sites or be used with express.

Basic syntax:
```javascript
<?
// we start our javascript content with <? and end it with ?>
// we can use <?= ?> to print a statement
// anything javascript goes, here's a test function
const myFunction = async () => { // async lets us await
  await print('<p>Hi from myFunction</p>');
};
?>
<!doctype>
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
Designed to facility code re-use and simple organisation of files
