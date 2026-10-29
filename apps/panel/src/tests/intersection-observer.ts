import { vi } from 'vitest';

type Instance = {
    element: Element | null;
    disconnected: boolean;
    callback: IntersectionObserverCallback;
};

/**
 * jsdom has no IntersectionObserver: this stand-in records each observer, and
 * `intersect()` tells the live ones their element came into view.
 */
export function stubIntersectionObserver() {
    const instances: Instance[] = [];

    vi.stubGlobal(
        'IntersectionObserver',
        class {
            private instance: Instance;

            constructor(callback: IntersectionObserverCallback) {
                this.instance = {
                    element: null,
                    disconnected: false,
                    callback,
                };
                instances.push(this.instance);
            }

            observe(element: Element) {
                this.instance.element = element;
            }

            disconnect() {
                this.instance.disconnected = true;
            }

            unobserve() {}
        },
    );

    return {
        live: () =>
            instances.filter(
                (instance) => !instance.disconnected && instance.element,
            ),
        intersect() {
            for (const instance of instances) {
                if (!instance.disconnected && instance.element) {
                    instance.callback(
                        [
                            {
                                isIntersecting: true,
                                target: instance.element,
                            } as IntersectionObserverEntry,
                        ],
                        {} as IntersectionObserver,
                    );
                }
            }
        },
    };
}
