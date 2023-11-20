import i18next from 'i18next';
import { initLitI18n, translate as t } from '../../index';

i18next.use(initLitI18n).init({
    lng: 'en',
    resources: {
        en: {
            translation: {
                hello: 'en-hello',
                whatishow: '{{what}} is {{how}}',
                datamodel: '{{person.name}} is a {{person.age}} year old and is male: {{person.male}}',
            },
        },
        fr: {
            translation: {
                hello: 'fr-hello',
                whatishow: '{{what}} est {{how}}',
                datamodel: '{{person.name}} a {{person.age}} ans et est un homme: {{person.male}}',
            },
        },
    },
});

// eslint-disable-next-line require-jsdoc
console.log(t('test'));

