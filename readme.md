# lit-i18n
i18next lit-html directive (could possible add other i18n backends).

[![Build Status](https://dev.azure.com/colscott/lit-i18n/_apis/build/status/colscott.lit-i18n?branchName=master)](https://dev.azure.com/colscott/lit-i18n/_build/latest?definitionId=2&branchName=master)

## Install
    npm install lit-i18n
## Usage
### Config
Nothing new here. Just use the usual i18next [config](https://www.i18next.com/overview/configuration-options). You can import from i18next. Alternatively, lit-i18n exports i18next.

    import { i18next } from '/node_modules/lit-i18n/src/lit-i18n.js';

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
lit-i18n exposes a directive called translate. The translate directive has the same signature and functionality as the i18next [t method](https://www.i18next.com/overview/api#t). It also exposes i18next, and lit-htmls html and render methods.
    
    import { translate as t, i18next, html, render } from '/node_modules/lit-i18n/src/lit-i18n.js';

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