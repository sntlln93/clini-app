import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import { Link, useRouterState } from '@tanstack/react-router';
import { Fragment } from 'react';

export function PanelBreadcrumbs() {
    const pathname = useRouterState({
        select: (state) => state.location.pathname,
    });
    const crumbs = buildBreadcrumbs(pathname);

    return (
        <Breadcrumb aria-label="Miga de pan" className="mb-4">
            <BreadcrumbList>
                {crumbs.map((crumb, index) => {
                    const isLast = index === crumbs.length - 1;

                    return (
                        <Fragment key={`${crumb.label}-${index}`}>
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>
                                        {crumb.label}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink
                                        render={<Link to={crumb.href} />}
                                    >
                                        {crumb.label}
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator />}
                        </Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
