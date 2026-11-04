/* global describe, before, after, beforeEach, afterEach, it */
/* Jasmine will be loaded by the test framework. No need to import it. */
import { expect } from '@esm-bundle/chai';
import i18next from 'i18next';
import { html, render } from 'lit-html';
import { translate as t, translateWhen, registry, registryCleanup, initLitI18n } from '../../src/lit-i18n.js';

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
                optional: 'Optional',
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
                optional: '',
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

/**
 * Host that manages its RootPart the way LitElement does: the part is disconnected when the element leaves the DOM
 * and reconnected when it returns, so directives get their `disconnected`/`reconnected` callbacks.
 */
class I18nMovable extends HTMLElement {
    /** @inheritdoc */
    constructor() {
        super();
        this.key = 'key';
        /** @type {import('lit-html').RootPart | undefined} */
        this.rootPart = undefined;
    }

    /** @inheritdoc */
    connectedCallback() {
        if (this.rootPart) {
            this.rootPart.setConnected(true);
        } else {
            this.update();
        }
    }

    /** @inheritdoc */
    disconnectedCallback() {
        this.rootPart?.setConnected(false);
    }

    /** Renders the current key, connected or not, like a LitElement property change would */
    update() {
        this.rootPart = render(
            html`<span class="text">${t(this.key)}</span><div class="attr" title="${t(this.key)}"></div>`,
            this,
            { isConnected: this.isConnected },
        );
    }

    /** @returns {string} */
    get text() {
        return this.querySelector('.text').textContent;
    }

    /** @returns {string} */
    get attr() {
        return this.querySelector('.attr').title;
    }
}
customElements.define('i18n-movable', I18nMovable);

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
            await nextThread();
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
    it('Should react to language changes', async () => {
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

describe('Moving and detaching', () => {
    /** @type {HTMLElement} */
    let otherContainer;
    /** @type {I18nMovable} */
    let elem;

    beforeEach(async () => {
        otherContainer = document.body.appendChild(document.createElement('div'));
        elem = /** @type {I18nMovable} */ (addElement('i18n-movable'));
        await nextThread();
        expect(elem.text).to.equal('Some translation');
        expect(elem.attr).to.equal('Some translation');
    });

    afterEach(async () => {
        tidyElements();
        otherContainer.remove();
        await i18next.changeLanguage('en');
    });

    it('Should follow language changes after a move', async () => {
        otherContainer.append(elem);
        await i18next.changeLanguage('fr');
        await nextThread();
        expect(elem.text).to.equal('Un peu de traduction');
        expect(elem.attr).to.equal('Un peu de traduction');
    });

    it('Should show a language change that happened while detached', async () => {
        elem.remove();
        await i18next.changeLanguage('fr');
        await nextThread();
        otherContainer.append(elem);
        await nextThread();
        expect(elem.text).to.equal('Un peu de traduction');
        expect(elem.attr).to.equal('Un peu de traduction');
    });

    it('Should show a key changed while detached once re-attached', async () => {
        elem.remove();
        elem.key = 'entername';
        elem.update();
        await nextThread();
        otherContainer.append(elem);
        await nextThread();
        expect(elem.text).to.equal('Enter Name');
        expect(elem.attr).to.equal('Enter Name');
        await i18next.changeLanguage('fr');
        await nextThread();
        expect(elem.text).to.equal('Entrez le nom');
        expect(elem.attr).to.equal('Entrez le nom');
    });

    it('Should not hold detached parts in the registry', async () => {
        elem.remove();
        elem.key = 'entername';
        elem.update();
        await nextThread();
        expect([...registry.keys()].some((directive) => directive.isConnected === false)).to.equal(false);
    });
});

describe('Discarded directives', () => {
    /** @type {HTMLElement} */
    let container;

    beforeEach(() => {
        container = document.body.appendChild(document.createElement('div'));
    });

    afterEach(() => {
        container.remove();
    });

    it('Should not overwrite content that replaced a translation', async () => {
        /** @param {unknown} value */
        const template = (value) => html`<p title="${value}">${value}</p>`;
        render(template(t('key')), container);
        render(template('replaced'), container);
        await nextThread();
        const paragraph = container.querySelector('p');
        expect(paragraph.textContent).to.equal('replaced');
        expect(paragraph.title).to.equal('replaced');
    });

    it('Should not overwrite content that replaced a pending translateWhen', async () => {
        /** @type {() => void} */
        let loaded = () => {};
        const loading = new Promise((res) => {
            loaded = res;
        });
        /** @param {unknown} value */
        const template = (value) => html`<p>${value}</p>`;
        render(template(translateWhen(loading, 'key')), container);
        render(template(html`<i>data</i>`), container);
        loaded();
        await nextThread();
        expect(container.querySelector('p').textContent).to.equal('data');
        expect(container.querySelector('i')).to.not.equal(null);
    });
});

describe('Empty translations', () => {
    /** @type {I18nMovable} */
    let elem;

    beforeEach(async () => {
        elem = /** @type {I18nMovable} */ (addElement('i18n-movable'));
        elem.key = 'optional';
        elem.update();
        await nextThread();
        expect(elem.text).to.equal('Optional');
        expect(elem.attr).to.equal('Optional');
    });

    afterEach(async () => {
        tidyElements();
        await i18next.changeLanguage('en');
    });

    it('Should clear when re-rendered with a key that translates to empty', async () => {
        await i18next.changeLanguage('fr');
        elem.key = 'key';
        elem.update();
        await nextThread();
        expect(elem.text).to.equal('Un peu de traduction');
        elem.key = 'optional';
        elem.update();
        await nextThread();
        expect(elem.text).to.equal('');
        expect(elem.attr).to.equal('');
    });

    it('Should clear on re-attach after changing to a language where the key is empty', async () => {
        elem.remove();
        await i18next.changeLanguage('fr');
        document.body.append(elem);
        elements.push(elem);
        await nextThread();
        expect(elem.text).to.equal('');
        expect(elem.attr).to.equal('');
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
