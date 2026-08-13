// Local ESLint rule: require an explicit `nativeButton` prop when one of
// this project's button-like Base UI wrappers is composed via `render` with
// a non-native element (e.g. `<Link>`, `<a>`). These wrappers render a
// native <button> by default; swapping in a non-native element through
// `render` without passing `nativeButton={false}` triggers a Base UI
// runtime warning — see issue #54. Wired into eslint.config.js — see #63.
//
// The wrapper set below is taken verbatim from the exports of the 8 source
// files that consume @base-ui/react's `useButton`/nativeButton internals
// (confirmed against @base-ui/react/**/nativeButton usages):
// - components/ui/button.tsx        -> Button
// - components/ui/checkbox.tsx      -> Checkbox
// - components/ui/switch.tsx        -> Switch
// - components/ui/dropdown-menu.tsx -> DropdownMenuTrigger, DropdownMenuItem,
//                                      DropdownMenuCheckboxItem,
//                                      DropdownMenuRadioItem,
//                                      DropdownMenuSubTrigger
// - components/ui/select.tsx        -> SelectTrigger, SelectItem
// - components/ui/dialog.tsx        -> DialogTrigger, DialogClose
// - components/ui/sheet.tsx         -> SheetTrigger, SheetClose
// - components/ui/radio-group.tsx   -> RadioGroupItem
const BUTTON_LIKE_WRAPPERS = new Set([
    'Button',
    'Checkbox',
    'Switch',
    'DropdownMenuTrigger',
    'DropdownMenuItem',
    'DropdownMenuCheckboxItem',
    'DropdownMenuRadioItem',
    'DropdownMenuSubTrigger',
    'SelectTrigger',
    'SelectItem',
    'DialogTrigger',
    'DialogClose',
    'SheetTrigger',
    'SheetClose',
    'RadioGroupItem',
]);

export default {
    meta: {
        type: 'problem',
        docs: {
            description:
                'Require an explicit nativeButton prop when a button-like Base UI wrapper is composed via render with a non-native element.',
        },
        schema: [],
    },
    create(context) {
        return {
            JSXOpeningElement(node) {
                if (
                    node.name.type !== 'JSXIdentifier' ||
                    !BUTTON_LIKE_WRAPPERS.has(node.name.name)
                ) {
                    return;
                }

                const hasNativeButtonAttribute = node.attributes.some(
                    (attribute) =>
                        attribute.type === 'JSXAttribute' &&
                        attribute.name.type === 'JSXIdentifier' &&
                        attribute.name.name === 'nativeButton',
                );
                if (hasNativeButtonAttribute) {
                    return;
                }

                const renderAttribute = node.attributes.find(
                    (attribute) =>
                        attribute.type === 'JSXAttribute' &&
                        attribute.name.type === 'JSXIdentifier' &&
                        attribute.name.name === 'render',
                );
                if (!renderAttribute) {
                    return;
                }

                const renderValue = renderAttribute.value;
                if (
                    !renderValue ||
                    renderValue.type !== 'JSXExpressionContainer'
                ) {
                    return;
                }

                const renderExpression = renderValue.expression;
                if (renderExpression.type !== 'JSXElement') {
                    // A function/identifier/unknown render value is
                    // deliberately NOT reported: this rule only detects the
                    // literal-JSX-element case reliably, and flagging
                    // anything else risks false positives on legitimate
                    // patterns this rule cannot fully analyze.
                    return;
                }

                const renderElementName =
                    renderExpression.openingElement.name;
                if (
                    renderElementName.type === 'JSXIdentifier' &&
                    renderElementName.name === 'button'
                ) {
                    return;
                }

                context.report({
                    node: renderAttribute,
                    message:
                        'This wrapper renders a native <button> by default. Composing it with a non-native element via render (e.g. <Link>, <a>) triggers Base UI\'s nativeButton runtime warning. Pass nativeButton={false} explicitly — see issue #54.',
                });
            },
        };
    },
};
