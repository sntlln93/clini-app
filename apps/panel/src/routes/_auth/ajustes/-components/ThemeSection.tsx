import { ThemeToggle } from './ThemeToggle';

export function ThemeSection() {
    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Tema</h2>
                <p className="text-sm text-muted-foreground">
                    Elegí cómo se ve el panel. «Sistema» sigue la preferencia de
                    tu dispositivo.
                </p>
            </div>
            <ThemeToggle />
        </section>
    );
}
