import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    JoinAsProfessionalButton,
    joinableMembership,
} from '@/features/JoinAsProfessionalButton';
import { usePlan } from '@/lib/plan';
import { useSession } from '@/lib/session';
import { SUBSCRIPTION_SECTION_ID } from '@/lib/subscription';
import { Link } from '@tanstack/react-router';
import type { SetupProgress } from '../-hooks/setup-progress';
import { SetupStep } from './SetupStep';

/**
 * What a new practice needs before taking appointments (#286), linking to
 * the pages that already do each step. Never blocks the panel: it goes
 * away once the required steps are done.
 */
export function SetupChecklist({ progress }: { progress: SetupProgress }) {
    const { data: session } = useSession();
    const ownMembership = joinableMembership(session);
    // A practice already on a paid plan has nothing to choose here.
    const onFreePlan = usePlan()?.plan === 'free';

    return (
        <Card role="region" aria-labelledby="setup-checklist-title">
            <CardHeader>
                <CardTitle id="setup-checklist-title">Primeros pasos</CardTitle>
                <CardDescription>
                    Completá estos pasos para empezar a dar turnos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ol className="space-y-4">
                    <SetupStep
                        title="Sumá a quien atiende"
                        description="Si atendés pacientes, sumate como profesional; si no, invitá a quien atiende."
                        done={progress.has_professional}
                        action={
                            <>
                                {ownMembership && (
                                    <JoinAsProfessionalButton
                                        membership={ownMembership}
                                    />
                                )}
                                <Button
                                    variant={
                                        ownMembership ? 'outline' : 'default'
                                    }
                                    render={<Link to="/profesionales/nuevo" />}
                                    nativeButton={false}
                                >
                                    Invitar profesional
                                </Button>
                            </>
                        }
                    />
                    <SetupStep
                        title="Cargá los servicios"
                        description="Elegí las especialidades y los servicios de cada profesional, con su duración y precio."
                        done={progress.has_service}
                        action={
                            <Button
                                variant="outline"
                                render={<Link to="/ajustes" />}
                                nativeButton={false}
                            >
                                Ir a Ajustes
                            </Button>
                        }
                    />
                    <SetupStep
                        title="Configurá los horarios"
                        description="Cargá los días y horarios en que atiende cada profesional."
                        done={progress.has_availability}
                        action={
                            <Button
                                variant="outline"
                                render={<Link to="/disponibilidad" />}
                                nativeButton={false}
                            >
                                Ir a Disponibilidad
                            </Button>
                        }
                    />
                    {onFreePlan && (
                        <SetupStep
                            title="Elegí tu plan"
                            description="Empezás en Gratis. Si necesitás más funciones, cambiá de plan cuando quieras."
                            action={
                                <Button
                                    variant="outline"
                                    render={
                                        <Link
                                            to="/ajustes"
                                            hash={SUBSCRIPTION_SECTION_ID}
                                        />
                                    }
                                    nativeButton={false}
                                >
                                    Ver planes
                                </Button>
                            }
                        />
                    )}
                    <SetupStep
                        title="Compartí el link de reservas"
                        description="Tus pacientes pueden sacar turno online desde el link del consultorio."
                        action={
                            <Button
                                variant="outline"
                                render={<Link to="/ajustes" />}
                                nativeButton={false}
                            >
                                Ver el link
                            </Button>
                        }
                    />
                </ol>
            </CardContent>
        </Card>
    );
}
