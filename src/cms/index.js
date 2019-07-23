const { CMSPage, CMSField } = require('../../osiris-cms');

module.exports = new CMSPage({
  heading: 'Hi from the CMS!',
  description: 'Click a page to edit it',
  links: {
    'Generic': 'generic',
    'Test': 'test',
  },
});
