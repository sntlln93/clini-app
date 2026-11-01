// jsdom does not implement elementFromPoint, which input-otp polls to spot a
// password manager's badge over its field. Only the files that render one stub
// it: axe reads it too, and a global stub changes what the a11y tests check.
export function stubElementFromPoint(): void {
    document.elementFromPoint = () => null;
}
