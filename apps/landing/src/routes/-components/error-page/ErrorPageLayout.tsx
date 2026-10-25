import type { ReactNode } from 'react';
import { SiteFooter } from '../SiteFooter';
import { SiteHeader } from '../SiteHeader';
import { ErrorIllustration, type ErrorBadge } from './ErrorIllustration';

type ErrorPageLayoutProps = {
    badge: ErrorBadge;
    eyebrow: string;
    title: string;
    description: string;
    /** The ways out, as `CtaLink`s. */
    actions: ReactNode;
};

/** The landing's error pages (#304): the site's own header and footer around the same page the panel shows. */
export function ErrorPageLayout({
    badge,
    eyebrow,
    title,
    description,
    actions,
}: ErrorPageLayoutProps) {
    return (
        <div className="mx-auto max-w-295 px-4 sm:px-6 lg:px-12">
            {/* An error is never a page to index. */}
            <meta name="robots" content="noindex" />
            <SiteHeader />
            <main
                id="top"
                className="flex flex-col items-center gap-8 py-16 text-center"
            >
                <ErrorIllustration badge={badge} />
                <div className="grid max-w-xl gap-3">
                    <p className="text-sm font-medium tracking-[0.2em] text-primary uppercase">
                        {eyebrow}
                    </p>
                    <h1 className="text-3xl tracking-tight sm:text-4xl">
                        {title}
                    </h1>
                    <p className="text-base text-muted-foreground">
                        {description}
                    </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    {actions}
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
