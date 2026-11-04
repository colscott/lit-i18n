// @ts-check
import { noChange } from 'lit-html';
import { directive, AsyncDirective } from 'lit-html/async-directive.js';
import { PartType } from 'lit-html/directive.js';

/** @type {import('i18next').i18n | null} */
let i18n = null;

/** @type {(i18n: import('i18next').i18n) => void} */
let i18nResolver = () => {};

const i18Provider = new Promise((res) => {
    i18nResolver = res;
});

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
    i18nResolver(i18n);
};

/**
 * Used to keep track of Parts that need to be updated should the language change.
 * @type {Map<TranslateBase, { keys?: string|string[]; options?: {}; }>}
 */
export const registry = new Map();

/**
 * Parts swept from the registry while out of the document but still connected to lit-html, i.e. rendered with plain
 * `render()`, which never calls `reconnected`. Held weakly so they can be garbage collected, and re-registered on
 * the next language change in case they are put back in the document.
 * @type {Set<WeakRef<TranslateBase>>}
 */
const swept = new Set();

/**
 * Removes parts that are no longer connected.
 * Called internally on a timer but can also be called manually.
 */
export const registryCleanup = () => {
    swept.forEach((ref) => {
        const part = ref.deref();
        if (part === undefined || registry.has(part)) {
            swept.delete(ref);
        }
    });
    registry.forEach((details, part) => {
        if (part.isConnected === false || isConnected(part) === false) {
            registry.delete(part);
            if (part.isConnected && typeof WeakRef === 'function') {
                swept.add(new WeakRef(part));
            }
        }
    });
};

/** Parts rendered with plain `render()` never get `disconnected`, so removed ones are swept here. */
setInterval(registryCleanup, 10000);

let initialized = false;

/**
 * Iterates all registered translate directives re-evaluating the translations.
 * Parts out of the document are updated too, so they are current if put back.
 */
const updateAll = () => {
    registry.forEach((details, part) => {
        if (part.isConnected) {
            part.setValue(part.translate(details.keys, details.options));
        }
    });
    swept.forEach((ref) => {
        swept.delete(ref);
        const part = ref.deref();
        // `translate` registers it again, the next sweep moves it back here if still out of the document
        if (part?.isConnected && part.details && !registry.has(part)) {
            part.setValue(part.translate(part.details.keys, part.details.options));
        }
    });
};

/**
 * Lazily sets up i18next. Incase this library is loaded before i18next has been loaded.
 * This defers i18next setup until the first translation is requested.
 * @param {string|string[]} [keys]
 * @param {any} [opts]
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
    // eslint-disable-next-line prefer-destructuring
    const part = /** @type {import('lit-html/directive.js').Part} */ (translateDirective.part);
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

    /** @param {import('lit-html/directive.js').PartInfo} part */
    constructor(part) {
        super(part);

        /** @type {import('lit-html/directive.js').PartInfo} */
        this.part = part;
        /**
         * The last keys and options translated, re-used when the directive is reconnected.
         * @type {{ keys?: string|string[]; options?: {}; } | undefined}
         */
        this.details = undefined;
    }

    /**
     * @param {string | string[]} [keys] - translation key
     * @param {?any} [options] - i18next translation options
     * @returns {string|Symbol} translated string
     */
    translate(keys, options) {
        let opts = options;
        this.details = { keys, options: opts };

        // Either detached, and `reconnected` commits the latest details, or discarded by lit-html and the part is no longer ours
        if (this.isConnected === false) {
            return noChange;
        }

        registry.set(this, this.details);

        if (typeof options === 'function') {
            opts = options();
        }

        const translation = translateAndInit(keys, opts);

        // lit-html skips committing a value identical to the current one
        return translation === undefined ? noChange : translation;
    }

    /** clean up the registry */
    disconnected() {
        registry.delete(this);
    }

    /** Registers for language changes again and catches up on any that happened while disconnected */
    reconnected() {
        if (this.details) {
            this.setValue(this.translate(this.details.keys, this.details.options));
        }
    }
}

/** */
class Translate extends TranslateBase {
    /**
     * @param {string | string[]} [keys] - translation key
     * @param {any} [options] - i18next translation options
     * @returns {string|Symbol} translated string
     */
    render(keys, options) {
        i18Provider?.then(() => {
            this.setValue(this.translate(keys, options));
        });
        return noChange;
    }
}

/** */
class TranslateWhen extends TranslateBase {
    /**
     * @param {Promise} [promise] to wait for
     * @param {string | string[]} [keys] - translation key
     * @param {any} [options] - i18next translation options
     * @returns {string|Symbol} translated string
     */
    render(promise, keys, options) {
        promise?.then(() => {
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
 * @deprecated as of 4.0.0 use `translate` which already guarantees i18next is initialized
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
