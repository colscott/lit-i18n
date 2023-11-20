# lit-i18n
i18next lit-html directive (could possible add other i18n backends).

[![Build Status](https://dev.azure.com/colscott/lit-i18n/_apis/build/status/colscott.lit-i18n?branchName=master)](https://dev.azure.com/colscott/lit-i18n/_build/latest?definitionId=2&branchName=master)

## Install
    npm install lit-i18n
## Usage
### Initialization
Pass in the `initLitI18n` as an i18next plugin before initializing i18next with a [config](https://www.i18next.com/overview/configuration-options).
```js
import i18next from 'i18next';
import { initLitI18n } from 'lit-i18n'; 

i18next.use(initLitI18n).init({...});
```

### Performing Translations
Use the lit-i18n translate directive to perform translations in lit-html templates.

The translate directive has the same signature and functionality as the i18next [t method](https://www.i18next.com/overview/api#t).

```js    
import { translate as t } from 'lit-i18n';
import { html } from 'lit-html';

const template1 = html`${t('hello')}`;
const template2 = html`${t('whatishow', { what: 'i18next', how: 'great' })}`;
const template3 = html`${t('personDescription', { person: { name: fred, age: 34, male: true} })}`;
```

### LitElement example
```js
import i18next from 'i18next';
import { translate as t, initLitI18n } from 'lit-i18n';
import { LitElement, html } from 'lit';

// Initialize i18next with lit-i18n and config
i18next.use(initLitI18n).init({
    lng: 'en',
    resources: {
        en: {
            translation: {
                whatishow: '{{what}} is {{how}}',
                datamodel: '{{person.name}} is a {{person.age}} year old and is male: {{person.male}}',
            },
        },
        fr: {
            translation: {
                whatishow: '{{what}} est {{how}}',
                datamodel: '{{person.name}} a {{person.age}} ans et est un homme: {{person.male}}',
            },
        },
    },
});

// Create a LitElement that uses the lit-i18n translate directive
customElements.define(
    'test-i18n',
    class TestI18n extends LitElement {
        person = {
            name: 'Fred',
            age: 35,
            male: true,
        };

        /** @returns {import('lit-html/lit-html').TemplateResult} */
        render() {
            return html`
                <!-- Use translate directive as attribute -->
                <div title="${t('whatishow', { what: 'i18next', how: 'great' })}"></div>
                <!-- Use translate directive as Element text -->
                <span>${t('datamodel', { person: this.person })}</span>
            `;
        }
    },
);
```
