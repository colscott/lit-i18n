# lit-i18n
i18next lit-html directive (could possible add other i18n backends).

[![Build Status](https://dev.azure.com/colscott/lit-i18n/_apis/build/status/colscott.lit-i18n?branchName=master)](https://dev.azure.com/colscott/lit-i18n/_build/latest?definitionId=2&branchName=master)

## Install
    npm install lit-i18n
## Usage
Note: this library uses lit-html 2. If you use lit-html 1.x.x then please use lit-i18n 2.x.x.
### Config
Nothing new here. Just use the usual i18next [config](https://www.i18next.com/overview/configuration-options). You can import from i18next.

    i18next.init({
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

### Translations
lit-i18n exposes two directives called translate and translateWhen.
The translate directive has the same signature and functionality as the i18next [t method](https://www.i18next.com/overview/api#t). lit-i18n also exposes lit-htmls html and render methods.

#### translate    
    import { translate as t, html, render } from 'lit-i18n/src/lit-i18n.js';

    /** @typedef {{name: string; age: number; male: boolean}} Person */
    class I18nElement extends HTMLElement {
        /** @returns {Person} */
        get person() {
            return this._person;
        }

        /** @param {Person} */
        set person(value) {
            this._person = value;
            render(this.renderTemplate, this);
        }

        /** @inheritdoc */
        constructor() {
            super();
        }

        /** @inheritdoc */
        connectedCallback() {
            if (!this.person) {
                this.person = {
                    name: 'None',
                    age: 0,
                    male: false,
                };
            }
        }

        /** @returns {import('lit-html/lit-html').TemplateResult} */
        get renderTemplate() {
            return html`
                <div title="${t('whatishow', { what: 'i18next', how: 'great' })}"></div>
                <span>${t('datamodel', { person: this.person })}</span>
            `;
        }
    }

#### translateWhen directive - postponing translations until they have loaded
Screen flicker can occur if you load multiple namespaces and run translations prior to the tranlation resource being loaded. I18next returns promises that will resolve after the resources are ready.
If this happens you can use translateWhen.
translateWhen differs to translate in that it also accepts a Promise. This Promise would typically be the Promise returned by i18next.init or i18next.loadNamespaces or i18next.loadLanguages. The translateWhen directive will not try to translate the key until the Promise is resolved.
Passing the Promise every single time you call the directive can get a little much so you can wrap the directive and call the wrapper instead, like this:

    import { translateWhen } from 'lit-i18n/src/lit-i18n.js';

    const initializePromise = i18next.use(someBackend).init(....);
    const translateDirective = (keys, options) => translateWhen(initializePromise, keys, options);

    // Now you can use translateDirective in your lit-html templates.
    html`<div>${translateDirective('some.key')}</div>`