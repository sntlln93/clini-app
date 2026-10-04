import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { MemberInviteForm } from './-components/MemberInviteForm';

export const Route = createFileRoute('/_auth/profesionales/nuevo')({
    head: () => titleHead('Invitar miembro'),
    component: NuevoProfesionalPage,
});

function NuevoProfesionalPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Invitar miembro</h1>
            <MemberInviteForm />
        </div>
    );
}
