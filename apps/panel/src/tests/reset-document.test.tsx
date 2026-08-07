import { cleanup, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { resetDocument } from './reset-document';

function renderOpenDialog() {
    return render(
        <Dialog open>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cancelar turno</DialogTitle>
                </DialogHeader>
            </DialogContent>
        </Dialog>,
    );
}

describe('resetDocument', () => {
    it('removes every child of <body>', () => {
        document.body.appendChild(document.createElement('div'));
        document.body.appendChild(document.createElement('span'));

        resetDocument();

        expect(document.body.innerHTML).toBe('');
    });

    it("removes body's inline style attribute", () => {
        document.body.setAttribute('style', 'overflow: hidden;');

        resetDocument();

        expect(document.body.getAttribute('style')).toBeNull();
    });

    it("removes html's inline style and scroll-lock attributes", () => {
        document.documentElement.setAttribute('style', 'overflow: hidden;');
        document.documentElement.setAttribute('data-base-ui-scroll-locked', '');

        resetDocument();

        expect(document.documentElement.getAttribute('style')).toBeNull();
        expect(
            document.documentElement.getAttribute('data-base-ui-scroll-locked'),
        ).toBeNull();
    });

    it("removes Base UI's injected scrollbar style but leaves an unrelated <head> <style> untouched", () => {
        const baseUiStyle = document.createElement('style');
        baseUiStyle.setAttribute('data-href', 'base-ui-disable-scrollbar');
        document.head.appendChild(baseUiStyle);

        const unrelatedStyle = document.createElement('style');
        unrelatedStyle.setAttribute('data-testid', 'unrelated-style');
        document.head.appendChild(unrelatedStyle);

        resetDocument();

        expect(
            document.head.querySelector(
                'style[data-href="base-ui-disable-scrollbar"]',
            ),
        ).toBeNull();
        expect(
            document.head.querySelector('style[data-testid="unrelated-style"]'),
        ).not.toBeNull();

        unrelatedStyle.remove();
    });

    it('cleans up the real leak: a Dialog force-unmounted while still open', async () => {
        renderOpenDialog();

        // Base UI's scroll lock actually writes to the DOM on a deferred
        // (setTimeout 0) tick, not synchronously in its layout effect — wait
        // for it so the lock is really in place before force-unmounting.
        await new Promise((resolve) => setTimeout(resolve, 0));

        cleanup();

        // The real leak: unmounting while open leaves the lock's DOM writes
        // in place, since the unlock they'd normally trigger only ever
        // happens on a proper open -> closed transition.
        expect(document.body.getAttribute('style')).not.toBeNull();
        expect(document.documentElement.getAttribute('style')).not.toBeNull();
        expect(
            document.documentElement.getAttribute('data-base-ui-scroll-locked'),
        ).not.toBeNull();

        resetDocument();

        expect(document.body.innerHTML).toBe('');
        expect(document.body.getAttribute('style')).toBeNull();
        expect(document.documentElement.getAttribute('style')).toBeNull();
        expect(
            document.documentElement.getAttribute('data-base-ui-scroll-locked'),
        ).toBeNull();
    });

    it('is safe on an already-pristine document', () => {
        resetDocument();
        resetDocument();

        expect(document.body.getAttribute('style')).toBeNull();
        expect(document.documentElement.getAttribute('style')).toBeNull();
        expect(
            document.documentElement.getAttribute('data-base-ui-scroll-locked'),
        ).toBeNull();
    });
});
