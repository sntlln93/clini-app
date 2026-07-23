import { createFileRoute } from '@tanstack/react-router';
import { ThemeToggle } from './-components/ThemeToggle';

export const Route = createFileRoute('/ajustes/')({
    component: AjustesPage,
});

function AjustesPage() {
    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">Ajustes</h1>
                <p className="text-sm text-muted-foreground">
                    Personalizá la apariencia del panel.
                </p>
            </header>
            <section className="space-y-3">
                <div className="space-y-1">
                    <h2 className="text-sm font-medium">Tema</h2>
                    <p className="text-sm text-muted-foreground">
                        Elegí cómo se ve el panel. «Sistema» sigue la
                        preferencia de tu dispositivo.
                    </p>
                </div>
                <ThemeToggle />
            </section>
        </div>
    );
}
