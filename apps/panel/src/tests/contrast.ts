type Rgba = [number, number, number, number];

export type Theme = 'light' | 'dark';

/**
 * A color expression over the @clini/theme tokens: `'card'`, `'primary/90'`
 * (opacity modifier, as in Tailwind) or `'destructive/30 over muted/50 over
 * popover'` (each layer composited over the next, right to left).
 */
type ColorExpression = string;

function declarations(css: string, selector: string): Record<string, string> {
    const start = css.indexOf(`\n${selector} {`);
    if (start === -1) {
        throw new Error(`No "${selector}" block in the theme`);
    }
    const body = css.slice(start, css.indexOf('\n}', start));
    return Object.fromEntries(
        [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
            name,
            value.trim(),
        ]),
    );
}

function parseColor(value: string): Rgba {
    const hex = value.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
        return [0, 2, 4]
            .map((i) => parseInt(hex[1].slice(i, i + 2), 16))
            .concat(1) as Rgba;
    }
    const rgb = value.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/);
    if (rgb) {
        return [+rgb[1], +rgb[2], +rgb[3], +rgb[4]];
    }
    throw new Error(`Unsupported color value "${value}"`);
}

function over([r, g, b, a]: Rgba, base: Rgba): Rgba {
    return [
        r * a + base[0] * (1 - a),
        g * a + base[1] * (1 - a),
        b * a + base[2] * (1 - a),
        1,
    ];
}

function luminance([r, g, b]: Rgba): number {
    const [lr, lg, lb] = [r, g, b].map((channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** Reads the light (`:root`) and dark (`.dark`) palettes of the theme CSS. */
export function createPalette(css: string) {
    const light = declarations(css, ':root');
    const tokens: Record<Theme, Record<string, string>> = {
        light,
        dark: { ...light, ...declarations(css, '.dark') },
    };

    function token(theme: Theme, name: string): Rgba {
        let value = tokens[theme][name];
        for (let hops = 0; value?.startsWith('var(--'); hops++) {
            if (hops > 5) throw new Error(`Cyclic token "${name}"`);
            value = tokens[theme][value.slice('var(--'.length, -1)];
        }
        if (value === undefined) {
            throw new Error(`Unknown token "${name}" (${theme})`);
        }
        return parseColor(value);
    }

    function resolve(
        theme: Theme,
        expression: ColorExpression,
        base: Rgba,
    ): Rgba {
        return expression
            .split(' over ')
            .reverse()
            .reduce<Rgba>((below, layer) => {
                const [name, opacity] = layer.trim().split('/');
                const [r, g, b, a] = token(theme, name);
                const alpha = opacity === undefined ? a : (a * +opacity) / 100;
                return over([r, g, b, alpha], below);
            }, base);
    }

    /** WCAG 2.x contrast ratio between two color expressions. */
    function contrast(
        theme: Theme,
        foreground: ColorExpression,
        background: ColorExpression,
    ): number {
        // A translucent background sits on the page background; a
        // translucent foreground, on its own background.
        const bg = resolve(theme, background, token(theme, 'background'));
        const fg = resolve(theme, foreground, bg);
        const [lighter, darker] = [luminance(fg), luminance(bg)].sort(
            (a, b) => b - a,
        );
        return (lighter + 0.05) / (darker + 0.05);
    }

    return { contrast };
}
