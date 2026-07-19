import { Button } from '@/components/ui/button';
import { usePing } from '@/hooks/use-ping';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
    component: HomePage,
});

function HomePage() {
    const ping = usePing();

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-semibold">Clini Panel</h1>
            <Button>shadcn/ui listo</Button>
            <p className="text-sm text-muted-foreground">
                {ping.isPending && 'conectando a la api...'}
                {ping.isError && 'error al conectar con la api'}
                {ping.isSuccess && 'conectado a api'}
            </p>
        </div>
    );
}
