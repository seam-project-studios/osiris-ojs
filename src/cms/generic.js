const { CMSPage, CMSField } = require('../../osiris-cms');

module.exports = new CMSPage({
  heading: 'Generic stuff',
  description: '',
  fields: [
    new CMSField({
      i18n: 'test.welcome',
      element: 'input',
      args: {
        label: 'Welcome',
        type: 'text',
        title: 'Enter some text',
        required: true,
      }
    }),
  ],
});
