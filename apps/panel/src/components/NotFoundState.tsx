import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@tanstack/react-router';
import { ArrowLeft, CalendarDays, SearchX } from 'lucide-react';

/** Rendered for any URL no route matches (mistyped, or an old link). */
export function NotFoundState() {
    const router = useRouter();

    return (
        <EmptyState
            icon={SearchX}
            title="No encontramos esta página"
            description="Puede que el enlace esté mal escrito o que la página ya no exista."
            action={
                <div className="flex flex-wrap justify-center gap-2">
                    {router.history.canGoBack() && (
                        <Button
                            variant="outline"
                            onClick={() => router.history.back()}
                        >
                            <ArrowLeft data-icon="inline-start" />
                            Volver
                        </Button>
                    )}
                    <Button render={<Link to="/agenda" />} nativeButton={false}>
                        <CalendarDays data-icon="inline-start" />
                        Ir a la agenda
                    </Button>
                </div>
            }
        />
    );
}
