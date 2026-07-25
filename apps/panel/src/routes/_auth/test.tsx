import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/test')({
    component: TestPage,
});

function TestPage() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-semibold">Ruta de prueba</h1>
            <p className="text-sm text-muted-foreground">/test</p>
        </div>
    );
}
