import { ThemeToggle } from '@/components/ThemeToggle';
import { loginUrl, registerUrl } from '@/lib/links';
import { BrandMark } from './BrandMark';
import { CtaLink } from './CtaLink';

const SECTIONS = [
    { href: '#dia', label: 'Cómo funciona' },
    { href: '#precio', label: 'Precio' },
    { href: '#preguntas', label: 'Preguntas' },
];

/** Always visible: sticks to the top over a translucent, blurred backdrop. */
export function SiteHeader() {
    return (
        <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 -mx-4 flex flex-wrap items-center justify-between gap-4 border-b bg-background/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-12 lg:px-12">
            <a
                href="#top"
                aria-label="Clini, inicio"
                className="flex items-center gap-2 text-2xl font-medium tracking-tight text-primary"
            >
                <BrandMark />
                clini
            </a>
            <nav
                aria-label="Principal"
                className="flex flex-wrap items-center gap-3 text-sm md:gap-6"
            >
                {SECTIONS.map((section) => (
                    <a
                        key={section.href}
                        href={section.href}
                        className="hidden text-muted-foreground hover:text-foreground md:inline"
                    >
                        {section.label}
                    </a>
                ))}
                <ThemeToggle />
                <CtaLink href={loginUrl} variant="outline" size="sm">
                    Ingresar
                </CtaLink>
                <CtaLink href={registerUrl} size="sm">
                    Empezar gratis
                </CtaLink>
            </nav>
        </header>
    );
}
