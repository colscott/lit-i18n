/* global describe, beforeAll, afterAll, jasmine, it, expect */
/* Jasmine will be loaded by the test framework. No need to import it. */
import { translate as t, i18next, html, render, registry, registryCleanup } from '../../src/lit-i18n.js';

/** i18next config */
i18next.init({
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

let originalTimeout = 0;
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

/** Tests */
describe('Translations', () => {
    it('Should perform translation', () => {
        const elem = addElement('i18n-full');
        if (elem instanceof I18nFull) {
            const personElem = elem.querySelector('.person');
            expect(personElem.innerText).toEqual('None is a 0 year old and is male: false');
            elem.person = {
                name: 'Fred',
                age: 46,
                male: true,
            };
            expect(personElem.innerText).toEqual('Fred is a 46 year old and is male: true');
        }
    });

    it('Should translate attributes', () => {
        const titleElem = addElement('i18n-full').querySelector('.title');
        expect(titleElem.title).toEqual('Element title attribute');
        const intElem = addElement('i18n-full').querySelector('.title-interpolation');
        expect(intElem.title).toEqual('i18next is great');
        const input = addElement('i18n-full').querySelector('.placeholder');
        expect(input.placeholder).toEqual('Enter Name');
    });
});

describe('Events', () => {
    afterAll(done => {
        i18next.changeLanguage('en').then(done);
    });
    it('Should react to language changes', done => {
        const elem = addElement('i18n-full');
        const titleElem = elem.querySelector('.title');
        expect(titleElem.title).toEqual('Element title attribute');
        const intElem = elem.querySelector('.title-interpolation');
        expect(intElem.title).toEqual('i18next is great');
        const input = elem.querySelector('.placeholder');
        expect(input.placeholder).toEqual('Enter Name');
        const personElem = elem.querySelector('.person');
        elem.person = {
            name: 'Fred',
            age: 46,
            male: true,
        };
        expect(personElem.innerText).toEqual('Fred is a 46 year old and is male: true');

        i18next.changeLanguage('fr').then(() => {
            expect(titleElem.title).toEqual("Attribut de titre d'élément");
            expect(intElem.title).toEqual('i18next est great');
            expect(input.placeholder).toEqual('Entrez le nom');
            expect(personElem.innerText).toEqual('Fred a 46 ans et est un homme: true');
            done();
        });
    });
});

describe('Garbage collection', () => {
    beforeAll(() => {
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
        tidyElements();
        registryCleanup();
    });

    afterAll(() => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        tidyElements();
    });

    it('Parts references should be released for garbage collect', done => {
        expect(registry.size).toBe(0);
        for (let i = 0, iLen = 1000; i < iLen; i++) {
            const elem = addElement();
            if (i > 100) {
                elem.remove();
            }
        }

        expect(registry.size).toBe(1000);
        setTimeout(() => {
            expect(registry.size).toBe(101);
            done();
        }, 10000);
    });
});
