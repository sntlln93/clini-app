import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';
import rule from './require-native-button.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
    languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
    },
});

ruleTester.run('require-native-button', rule, {
    invalid: [
        {
            name: 'a button-like wrapper composed with a router Link',
            code: '<Button render={<Link to="/x" />} />',
            errors: 1,
        },
        {
            name: 'the real regression from issue #54 / ProfileMenu.tsx',
            code: '<DropdownMenuItem render={<Link to="/ajustes" />}>Ajustes</DropdownMenuItem>',
            errors: 1,
        },
        {
            name: 'a native but non-button tag',
            code: '<SelectItem render={<a href="/x" />} />',
            errors: 1,
        },
        {
            name: 'an unrecognised component',
            code: '<DialogClose render={<SomeUnknownComponent />} />',
            errors: 1,
        },
        {
            name: 'a non-menu wrapper in the set',
            code: '<Checkbox render={<Link to="/x" />} />',
            errors: 1,
        },
        {
            name: 'nested composition reports only the inner offending wrapper',
            code: '<DropdownMenuTrigger render={<Button render={<Link to="/x" />} />} />',
            errors: 1,
        },
    ],
    valid: [
        {
            name: 'explicit opt-out with nativeButton={false}',
            code: '<Button render={<Link to="/x" />} nativeButton={false} />',
        },
        {
            name: 'explicit opt-out, attribute order reversed',
            code: '<DropdownMenuItem nativeButton={false} render={<Link to="/x" />} />',
        },
        {
            name: 'Button is a safe render target',
            code: '<DropdownMenuTrigger render={<Button variant="ghost" />} />',
        },
        {
            name: 'SidebarMenuButton is a safe render target',
            code: '<DropdownMenuTrigger render={<SidebarMenuButton />} />',
        },
        {
            name: 'a native button tag',
            code: '<SheetTrigger render={<button type="button" />} />',
        },
        {
            name: 'FormControl is not one of the 8 wrappers (acceptance criterion 2)',
            code: '<FormControl render={<Input placeholder="x" />} />',
        },
        {
            name: 'TooltipTrigger is not one of the 8 wrappers (acceptance criterion 2)',
            code: '<TooltipTrigger render={<Button>Ver</Button>} />',
        },
        {
            name: 'no render prop at all',
            code: '<Button variant="default">Guardar</Button>',
        },
        {
            name: 'a function render value is deliberately not reported',
            code: '<Button render={(props) => <Link {...props} />} />',
        },
        {
            name: 'a member-expression element name is not in the wrapper set',
            code: '<Menu.Item render={<Link to="/x" />} />',
        },
    ],
});
