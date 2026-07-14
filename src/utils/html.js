const HTML_ENTITY_PREFIX = String.fromCharCode(38);

const ATTRIBUTE_ENTITY_NAMES = Object.freeze({
  "&": "amp",
  '"': "quot",
  "<": "lt",
  ">": "gt",
});

/**
 * Escapes a value for a quoted HTML attribute without embedding entity
 * literals in the generated JavaScript bundle. SillyTavern passes the bundle
 * through srcdoc, where literal entities would be decoded as JavaScript source.
 */
export function escapeHtmlAttribute(value) {
  return String(value).replace(/[&"<>]/g, (character) => {
    return `${HTML_ENTITY_PREFIX}${ATTRIBUTE_ENTITY_NAMES[character]};`;
  });
}
