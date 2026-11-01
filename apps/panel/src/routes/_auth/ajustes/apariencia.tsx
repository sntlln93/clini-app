import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { ThemeSection } from './-components/ThemeSection';

export const Route = createFileRoute('/_auth/ajustes/apariencia')({
    head: () => titleHead('Apariencia', 'Ajustes'),
    component: ThemeSection,
});
