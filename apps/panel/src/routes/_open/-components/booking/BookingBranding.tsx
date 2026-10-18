import { LANDING_URL } from '@/lib/landing';
import type { BookingOrganization } from '@/types/booking';
import { brand } from '@clini/brand';

type BookingBrandingProps = {
    organization: Pick<BookingOrganization, 'name' | 'logo_url'>;
};

/** The organization's logo above the booking card, on a plan that includes it (#239). */
export function BookingLogo({ organization }: BookingBrandingProps) {
    if (organization.logo_url === null) {
        return null;
    }

    return (
        <div className="flex justify-center">
            <img
                src={organization.logo_url}
                alt={organization.name}
                className="max-h-16 max-w-60 object-contain"
            />
        </div>
    );
}

/** The Free plan's footer (#239), linking to the landing when its URL is configured. */
export function MadeWithClini() {
    return (
        <p className="text-center text-xs text-muted-foreground">
            Hecho con{' '}
            {LANDING_URL ? (
                <a
                    href={LANDING_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline-offset-4 hover:underline"
                >
                    {brand.name}
                </a>
            ) : (
                <span className="font-medium">{brand.name}</span>
            )}
        </p>
    );
}
