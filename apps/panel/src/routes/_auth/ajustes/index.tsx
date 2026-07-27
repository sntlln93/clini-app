import { Separator } from '@/components/ui/separator';
import { createFileRoute } from '@tanstack/react-router';
import { MySpecialtiesSection } from './-components/MySpecialtiesSection';
import { ProfessionalServicesSection } from './-components/ProfessionalServicesSection';
import { ProfessionalSpecialtiesSection } from './-components/ProfessionalSpecialtiesSection';
import { ThemeToggle } from './-components/ThemeToggle';

export const Route = createFileRoute('/_auth/ajustes/')({
    component: AjustesPage,
});

function AjustesPage() {
    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">Ajustes</h1>
                <p className="text-sm text-muted-foreground">
                    Personalizá la apariencia del panel y las asignaciones del
                    consultorio.
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

            <Separator />

            <MySpecialtiesSection />

            <Separator />

            <ProfessionalSpecialtiesSection />

            <Separator />

            <ProfessionalServicesSection />
        </div>
    );
}
