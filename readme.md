# lit-i18n
i18next lit-html directive (could possible add other i18n backends).

[![Build Status](https://dev.azure.com/colscott/lit-i18n/_apis/build/status/colscott.lit-i18n?branchName=master)](https://dev.azure.com/colscott/lit-i18n/_build/latest?definitionId=2&branchName=master)

## Install
    npm install lit-i18n
## Usage
### Config
Nothing new here. Just use the usual i18next [config](https://www.i18next.com/overview/configuration-options). You can import from i18next. Alternatively, lit-i18n exports i18next.

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
lit-i18n exposes a directive called translate. The translate directive has the same signature and functionality as the i18next [t method](https://www.i18next.com/overview/api#t). It also exposes lit-htmls html and render methods.
    
    import { translate as t, html, render } from '/node_modules/lit-i18n/src/lit-i18n.js';

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

## Browser first ES6 imports
This code uses ES6 style import in such a way that they can be loaded directly in the browser. To do this it uses relative import paths that start with either "/", "./" or "../".
For example:

    import { html } from '/node_modules/lit-html/lit-html.js';

However, this doesn't play nicely with tools like TypeScript or Webpack. We need configure these tools to recongnise the "/node_modules" path.

Fortunately this is easy:

### VS Code
To get intellisense to play nicely in VS Code you should set up a tsconfig.json or jsconfig.json as below.

### TypeScript
In your tsconfig.json or jsconfig.json:

    {
        "compilerOptions": {
            ....
            "baseUrl": ".", // This must be specified if "paths" is.
            "paths": {
                "/node_modules/*": ["node_modules/*"],
            },
            ....
        },
    }

### Webpack
In your webpack config add a resolver:

    resolve: {
        ....
        alias: {
            '/node_modules': path.resolve(__dirname, 'node_modules'),
        },
    },

### ESLint
In order to get ESLint to recognise the import:

    modules.exports = {
        ....
        settings : {
            "import/resolver": {
                node: {
                    extensions: [ 'js', 'mjs' ]
                },
                alias: {
                    map: [
                        ["/node_modules", "./node_modules"]
                    ],
                    expressions: [ 'js', 'mjs' ]
                }
            }
        },
        ....
    }