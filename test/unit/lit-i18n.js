/* global describe, before, after, it */
/* Jasmine will be loaded by the test framework. No need to import it. */
import { expect } from '@esm-bundle/chai';
import i18next from 'i18next';
import { html, render } from 'lit-html';
import { translate as t, registry, registryCleanup, initLitI18n } from '../../src/lit-i18n.js';

/** i18next config */
const i18nInitialized = i18next.use(initLitI18n).init({
    lng: 'en',
    debug: true,
    resources: {
        en: {
            translation: {
                key: 'Some translation',
                introduceself: 'My name is {{name}}',
                divtitle: 'Element title attribute',
                whatishow: '{{what}} is {{how}}',
                datamodel: '{{person.name}} is a {{person.age}} year old and is male: {{person.male}}',
                entername: 'Enter Name',
            },
        },
        fr: {
            translation: {
                key: 'Un peu de traduction',
                introduceself: "Je m'appelle {{name}}",
                divtitle: "Attribut de titre d'élément",
                whatishow: '{{what}} est {{how}}',
                datamodel: '{{person.name}} a {{person.age}} ans et est un homme: {{person.male}}',
                entername: 'Entrez le nom',
            },
        },
    },
});

/** test CustomElement */
customElements.define(
    'i18n-test',
    /** Test custom element */
    class I18nTestElement extends HTMLElement {
        /** Constructor */
        constructor() {
            super();
        }

        /** Hook in to render */
        connectedCallback() {
            this.render();
        }

        /**  */
        get renderTemplate() {
            return html`
                <span>${t('key')}</span>
            `;
        }

        /** Perform render */
        render() {
            render(this.renderTemplate, this);
        }
    },
);

/** @typedef {{name: string; age: number; male: boolean}} Person */
/** More complete example */
class I18nFull extends HTMLElement {
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
            <span class="basic">${t('introduceself', { name: this.person.name })}</span>
            <div class="title" title="${t('divtitle')}">Div with translated title</div>
            <div class="title-interpolation" title="${t('whatishow', { what: 'i18next', how: 'great' })}"></div>
            <span class="person">${t('datamodel', { person: this.person })}</span>
            <input class="placeholder" type="text" placeholder="${t('entername')}" />
        `;
    }
}
customElements.define('i18n-full', I18nFull);

/** @type {Array<Element>} */
let elements = [];

/** Removes any added elements */
const tidyElements = () => {
    elements.forEach(e => e.parentElement && e.remove());
    elements = [];
};

/**
 * Adds a test element to the DOM
 * @param {string} tag
 * @returns {Element}
 */
const addElement = tag => {
    return elements[elements.push(document.body.appendChild(document.createElement(tag || 'i18n-test'))) - 1];
};

mocha.setup({
    timeout: 15000,
});

function nextThread() {
    return new Promise((res) => setTimeout(res));
}

/** Tests */

i18nInitialized.then(() => {
    describe('Translations', () => {
        it('Should perform translation', async () => {
            const elem = addElement('i18n-full');
            if (elem instanceof I18nFull) {
                const personElem = elem.querySelector('.person');
                await nextThread();
                expect(personElem.innerText).to.equal('None is a 0 year old and is male: false');
                elem.person = {
                    name: 'Fred',
                    age: 46,
                    male: true,
                };
                expect(personElem.innerText).to.equal('Fred is a 46 year old and is male: true');
            }
        });

        it('Should translate attributes', async () => {
            const titleElem = addElement('i18n-full').querySelector('.title');
            await nextThread();
            expect(titleElem.title).to.equal('Element title attribute');
            const intElem = addElement('i18n-full').querySelector('.title-interpolation');
            await nextThread();
            expect(intElem.title).to.equal('i18next is great');
            const input = addElement('i18n-full').querySelector('.placeholder');
            await nextThread();
            expect(input.placeholder).to.equal('Enter Name');
        });
    });

    describe('Events', () => {
        after(async () => {
            await i18next.changeLanguage('en');
        });
        it('Should react to language changes', asyn () => {
            const elem = addElement('i18n-full');
            const titleElem = elem.querySelector('.title');
            await nextThread();
            expect(titleElem.title).to.equal('Element title attribute');
            const intElem = elem.querySelector('.title-interpolation');
            await nextThread();
            expect(intElem.title).to.equal('i18next is great');
            const input = elem.querySelector('.placeholder');
            await nextThread();
            expect(input.placeholder).to.equal('Enter Name');
            const personElem = elem.querySelector('.person');
            elem.person = {
                name: 'Fred',
                age: 46,
                male: true,
            };
            await nextThread();
            expect(personElem.innerText).to.equal('Fred is a 46 year old and is male: true');

            await i18next.changeLanguage('fr');
            await nextThread();
            expect(titleElem.title).to.equal("Attribut de titre d'élément");
            expect(intElem.title).to.equal('i18next est great');
            expect(input.placeholder).to.equal('Entrez le nom');
            expect(personElem.innerText).to.equal('Fred a 46 ans et est un homme: true');
        });
    });

    describe('Garbage collection', () => {
        before(() => {
            tidyElements();
            registryCleanup();
        });

        after(() => {
            tidyElements();
        });

        it('Parts references should be released for garbage collect', done => {
            expect(registry.size).to.equal(0);
            for (let i = 0, iLen = 1000; i < iLen; i++) {
                const elem = addElement();
                if (i > 100) {
                    elem.remove();
                }
            }
            nextThread().then(() => {

                expect(registry.size).to.equal(1000);
                setTimeout(() => {
                    expect(registry.size).to.equal(101);
                    done();
                }, 11000);
            });
        });
    });
});
