import { bookingUrl } from '@/lib/booking-link';
import { PublicLinkActions } from './PublicLinkActions';

/** The practice's own booking link, set when the organization is created (CU-44): read-only, for any member to share. */
export function OrganizationBookingLinkSection({ slug }: { slug: string }) {
    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">
                    Link de reservas del consultorio
                </h2>
                <p className="text-sm text-muted-foreground">
                    Compartilo con tus pacientes para que reserven turnos online
                    con cualquier profesional del consultorio que tenga
                    prestaciones y horarios cargados.
                </p>
            </div>
            <PublicLinkActions
                url={bookingUrl(slug)}
                label="Link del consultorio"
            />
        </section>
    );
}
