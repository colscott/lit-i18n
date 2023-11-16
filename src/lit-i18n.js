// @ts-check
import { noChange } from 'lit-html';
import { directive, AsyncDirective } from 'lit-html/async-directive.js';
import { PartType } from 'lit-html/directive.js';

/** @type {import('i18next').i18n} */
let i18n = null;

/** @type {import('i18next').ThirdPartyModule} */
export const initLitI18n = {
    type: '3rdParty',

    /**
     * initialize the i18next instance to use
     * @param {import('i18next').i18n} i18nextInstance to use
     */
    init(i18nextInstance) {
        setI18n(i18nextInstance);
    },
};

/**
 * Sets the i18next instance to use for the translations.
 * Favor using the plugin
 * @example
 * ```js
 * i18next.use(initLitI18n)
 * ```
 * @param {import('i18next').i18n} i18nextInstance
 */
export const setI18n = (i18nextInstance) => {
    i18n = i18nextInstance;
};

/**
 * Used to keep track of Parts that need to be updated should the language change.
 * @type {Map<TranslateBase, { keys: string|string[]; options: {}; }>}
 */
export const registry = new Map();

/**
 * Removes parts that are no longer connected.
 * Called internally on a timer but can also be called manually.
 */
export const registryCleanup = () => {
    registry.forEach((details, part) => {
        if (part.isConnected === false || isConnected(part) === false) {
            registry.delete(part);
        }
    });
};

/** lit-html does not seem to fire life cycle hook for part disconnected, we need to record and manage parts ourselves. */
setInterval(registryCleanup, 10000);

let initialized = false;

/** Iterates all registered translate directives re-evaluating the translations */
const updateAll = () => {
    registry.forEach((details, part) => {
        if (part.isConnected && isConnected(part)) {
            const translation = translateAndInit(details.keys, details.options);
            part.setValue(translation);
        }
    });
};

/**
 * Lazily sets up i18next. Incase this library is loaded before i18next has been loaded.
 * This defers i18next setup until the first translation is requested.
 * @param {string|string[]} keys
 * @param {any} opts
 * @returns {string}
 */
function translateAndInit(keys, opts) {
    if (!i18n) {
        return '';
    }

    if (initialized === false) {
        /** Handle language changes */
        i18n.on('languageChanged', updateAll);
        // @ts-ignore
        i18n.store.on('added', updateAll);
        initialized = true;
    }

    const translation = i18n.t(keys, opts);

    if (typeof translation === 'string') {
        return translation;
    }
    // returnObjects not supported https://www.i18next.com/translation-function/objects-and-arrays#objects
    return '';
}

/**
 * @param {TranslateBase} translateDirective
 * @returns {boolean}
 */
const isConnected = (translateDirective) => {
    const { part } = translateDirective;
    if (part.type === PartType.ATTRIBUTE) return part.element.isConnected;
    if (part.type === PartType.CHILD) return part.parentNode ? part.parentNode.isConnected : false;
    if (part.type === PartType.PROPERTY) return part.element.isConnected;
    if (part.type === PartType.BOOLEAN_ATTRIBUTE) return part.element.isConnected;
    if (part.type === PartType.EVENT) return part.element.isConnected;
    if (part.type === PartType.ELEMENT) return part.element.isConnected;
    throw new Error('Unsupported Part');
};

/** */
class TranslateBase extends AsyncDirective {
    /** @abstract */
    render() {}

    /** @param {import('lit-html/directive.js').Part} part */
    constructor(part) {
        super(part);

        this.value = '';
        /** @type {import('lit-html/directive.js').Part} */
        this.part = part;
    }

    /**
     * @param {string | string[]} keys - translation key
     * @param {?any} [options] - i18next translation options
     * @returns {string|Symbol} translated string
     */
    translate(keys, options) {
        let opts = options;
        registry.set(this, { keys, options: opts });

        if (typeof options === 'function') {
            opts = options();
        }

        const translation = translateAndInit(keys, opts);

        if (this.isConnected === false || translation === undefined || this.value === translation) {
            return noChange;
        }

        return translation;
    }

    /** clean up the registry */
    disconnected() {
        registry.delete(this);
    }
}

/** */
class Translate extends TranslateBase {
    /**
     * @param {string | string[]} [keys] - translation key
     * @param {?any} [options] - i18next translation options
     * @returns {string|Symbol} translated string
     */
    render(keys, options) {
        return this.translate(keys, options);
    }
}

/** */
class TranslateWhen extends TranslateBase {
    /**
     * @param {Promise} [promise] to wait for
     * @param {string | string[]} [keys] - translation key
     * @param {?any} [options] - i18next translation options
     * @returns {string|Symbol} translated string
     */
    render(promise, keys, options) {
        promise.then(() => {
            this.setValue(this.translate(keys, options));
        });
        return noChange;
    }
}

/**
 * The translate directive
 * @example
 * ```js
 * import { translate as t, i18next, html, render } from 'lit-i18n/src/lit-i18n.js';
 * i18next.init({...i18next config...});
 * class MyElement extends HTMLElement {
 *     connectedCallback() {
 *         this.person = { name: 'Fred', age: 23, male: true };
 *         render(this.renderTemplate, this);
 *     }
 *     get renderTemplate() {
 *         return html`
 *             <span class="basic">${t('introduceself', { name: this.person.name })}</span>
 *             <div class="title" title="${t('divtitle')}">Div with translated title</div>
 *             <div class="title-interpolation" title="${t('whatishow', { what: 'i18next', how: 'great' })}"></div>
 *             <span class="person">${t('datamodel', { person: this.person })}</span>
 *             <input class="placeholder" type="text" placeholder="${t('entername')}" />
 *         `;
 *     }
 * }
 * ```
 */
export const translate = directive(Translate);

/**
 * Can be used like translate but it also takes a Promise. This can be used if you can't guarantee if the i18next resource bundle is loaded.
 * @example
 * ```js
 * import { translateWhen } from 'lit-i18n/src/lit-i18n.js';
 * const initializeI18next = i18next.use(someBackend).init(....);
 * const translateDirective = (keys, options) => translateWhen(initializeI18next, keys, options);
 * // Now you can use translateDirective in your lit-html templates.
 * html`<div>${translateDirective('some.key')}</div>`
 * ```
 */
export const translateWhen = directive(TranslateWhen);
