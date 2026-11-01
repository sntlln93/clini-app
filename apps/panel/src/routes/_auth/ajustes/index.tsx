import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

// Mails and checkouts started before Ajustes had tabs land here: the
// checkout return (`?suscripcion=retorno`) goes on to its tab with the flag.
const ajustesSearchSchema = z.object({
    suscripcion: z.literal('retorno').optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/ajustes/')({
    validateSearch: (search) => ajustesSearchSchema.parse(search),
    beforeLoad: ({ search }) => {
        if (search.suscripcion === 'retorno') {
            throw redirect({
                to: '/ajustes/suscripcion',
                search: { suscripcion: 'retorno' },
                replace: true,
            });
        }

        throw redirect({ to: '/ajustes/apariencia', replace: true });
    },
});
