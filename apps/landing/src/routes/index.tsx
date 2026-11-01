import { pageHead, SITE_DESCRIPTION, SITE_TITLE } from '@/lib/page-head';
import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from './-components/LandingPage';

export const Route = createFileRoute('/')({
    head: () =>
        pageHead({
            path: '/',
            title: SITE_TITLE,
            description: SITE_DESCRIPTION,
        }),
    component: LandingPage,
});
