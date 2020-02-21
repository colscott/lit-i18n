/* global i18next */
// @ts-check
import {
    directive,
    html,
    render,
    svg,
    AttributePart,
    NodePart,
    BooleanAttributePart,
    EventPart,
} from 'lit-html/lit-html.js';

export { html, svg, render };

/**
 * Used to keep track of Parts that need to be updated should the language change.
 * @type {Map<import('lit-html/lib/part').Part, { keys: string|string[]; options: {}; }>}
 */
export const registry = new Map();

/**
 * Removes parts that are no longer connected.
 * Called internally on a timer but can also be called manually.
 */
export const registryCleanup = () => {
    registry.forEach((details, part) => {
        if (isConnected(part) === false) {
            registry.delete(part);
        }
    });
};

/** Since lit-html does not have a life cycle hook for part disconnected, we need to record and manage parts ourselves. */
setInterval(registryCleanup, 10000);

let initialized = false;

/** Iterates all registered translate directives re-evaluating the translations */
const updateAll = () => {
    registry.forEach((details, part) => {
        if (isConnected(part)) {
            setPartValue(part, details.keys, details.options);
        }
    });
}

/**
 * Lazily sets up i18next. Incase this library is loaded before i18next has been loaded.
 * This defers i18next setup until the first translation is requested.
 * @param {string|string[]} keys
 * @param {any} opts
 * @returns {string}
 */
function translateAndInit(keys, opts) {
    /** @type {import('i18next/index').default} */
    // @ts-ignore
    const i18n = i18next;

    if (initialized === false) {
        /** Handle language changes */
        i18n.on('languageChanged', updateAll);
        // @ts-ignore
        i18n.store.on('added', updateAll);
        initialized = true;
    }

    return i18n.t(keys, opts);
}

/**
 * @param {import('lit-html/lib/part').Part} part
 * @returns {boolean}
 */
const isConnected = part => {
    if (part instanceof NodePart) return part.startNode.isConnected && part.endNode.isConnected;
    if (part instanceof AttributePart) return part.committer.element.isConnected;
    if (part instanceof BooleanAttributePart || part instanceof EventPart || part instanceof EventPart)
        return part.element.isConnected;
    throw new Error('Unsupport Part');
};

/**
 * @param {import('lit-html/lib/part').Part}  part
 * @param {string | string[]} keys - translation key
 * @param {?any} [options] - i18next translation options
 */
const setPartValue = (part, keys, options) => {
    let opts = options;
    registry.set(part, { keys, options: opts });

    if (typeof options === 'function') {
        opts = options();
    }

    const translation = translateAndInit(keys, opts);

    if (part.value === translation) {
        return;
    }

    part.setValue(translation);
    part.commit();
};

/**
 * The translate directive
 * @example
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
 */
export const translate = directive(
    /**
     * @param {string | string[]} keys
     * @param {?any} [options]
     */
    (keys, options) =>
        /** @param {import('lit-html/lib/part').Part}  part */
        part => {
            setPartValue(part, keys, options);
        },
);
