const LOWERCASE_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'en']);
const ROMAN_NUMERAL = /^[IVXLC]+$/;

/**
 * A license's issuer as the national registry writes it, readable (#380):
 * REFEPS inverts and uppercases it («KINESIÓLOGOS, Colegio de», «MEDICOS
 * DISTRITO I, Colegio de»), so the part after the last comma goes first and
 * every word gets a capital, connectors and district numerals aside
 * («Colegio de Kinesiólogos», «Colegio de Médicos Distrito I»). Only the
 * display changes: the API keeps the registry's text.
 */
export function formatLicenseIssuer(issuer: string): string {
    const comma = issuer.lastIndexOf(',');
    const ordered =
        comma === -1
            ? issuer
            : `${issuer.slice(comma + 1)} ${issuer.slice(0, comma)}`;

    return ordered
        .split(/\s+/)
        .filter((word) => word !== '')
        .map((word, index) => {
            if (ROMAN_NUMERAL.test(word) && word.length <= 4 && index > 0) {
                return word;
            }

            const lower = word.toLocaleLowerCase('es');

            return index > 0 && LOWERCASE_WORDS.has(lower)
                ? lower
                : lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1);
        })
        .join(' ');
}
