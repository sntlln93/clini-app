import type { Billing } from '@/lib/pricing';

export function PricingNotes({ billing }: { billing: Billing }) {
    const notes = [
        {
            title: 'Cómo se paga',
            body:
                billing === 'annual'
                    ? 'Un solo pago al año con Mercado Pago. Se renueva al año siguiente y podés cancelar antes.'
                    : 'Débito automático mensual con Mercado Pago. Cancelás cuando quieras.',
        },
        {
            title: 'Si llegás al límite',
            body: 'En el plan Gratis te avisamos al llegar a 35 turnos del mes. Pasás a Consultorio con un clic y no perdés nada.',
        },
        {
            title: 'Si un pago falla',
            body: 'Tenés 7 días para regularizar. Después la agenda queda en solo lectura, con tus datos intactos.',
        },
    ];

    return (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {notes.map((note) => (
                <div
                    key={note.title}
                    className="grid content-start gap-1.5 rounded-2xl border bg-card px-5 py-4 text-sm"
                >
                    <span className="font-medium">{note.title}</span>
                    <p className="text-muted-foreground">{note.body}</p>
                    {note.title === 'Si un pago falla' && (
                        <div
                            aria-hidden="true"
                            className="mt-1 grid h-2 grid-cols-[3fr_1fr_2fr] gap-0.75 overflow-hidden rounded-full"
                        >
                            <span className="bg-success" />
                            <span className="bg-destructive" />
                            <span className="bg-border" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
