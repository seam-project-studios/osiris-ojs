# Osiris and OJS

## OJS is an asyncronous Javascript template engine.
Designed to build static sites or be used with express.

Basic syntax:
```javascript
<!doctype>
<html>
<head>
  <title><?='Hi from Javascript!' ?></title>
</head>
<body>
<?
await print('<p>We must await our print statements</p>');
await print('<p>Everything is asyncronous here</p>');
?>
</body>
</html>
```

## Osiris is a framework built on top of OJS
Designed to facility code re-use and simple organisation of files
