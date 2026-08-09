import type {
    AvailableSlot,
    BookingConfirmation as BookingConfirmationData,
    BookingOrganization,
    BookingProfessional,
} from '@/types/booking';
import { useState } from 'react';
import { BookingConfirmation } from './BookingConfirmation';
import { BookingPatientForm } from './BookingPatientForm';
import { BookingSelectionStep } from './BookingSelectionStep';
import { BookingSlotPicker } from './BookingSlotPicker';

type BookingSearch = {
    specialty?: number;
    professional?: number;
    service?: number;
    date?: string;
};

type BookingWizardProps = {
    slug: string;
    organization: BookingOrganization;
    professionals: BookingProfessional[];
    slots: AvailableSlot[];
    search: BookingSearch;
    onSearchChange: (next: Partial<BookingSearch>) => void;
};

/**
 * Presentational only: the current step derives from the URL-owned
 * `search`, plus `selectedSlot`/`confirmation`, which stay local because
 * neither parametrizes a read.
 */
export function BookingWizard({
    slug,
    organization,
    professionals,
    slots,
    search,
    onSearchChange,
}: BookingWizardProps) {
    const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(
        null,
    );
    const [confirmation, setConfirmation] =
        useState<BookingConfirmationData | null>(null);

    if (confirmation) {
        return (
            <BookingConfirmation
                confirmation={confirmation}
                timezone={organization.timezone}
            />
        );
    }

    if (selectedSlot && search.professional && search.service) {
        return (
            <BookingPatientForm
                slug={slug}
                membershipId={search.professional}
                serviceId={search.service}
                slot={selectedSlot}
                onBack={() => setSelectedSlot(null)}
                onConfirmed={setConfirmation}
            />
        );
    }

    if (search.professional && search.service) {
        return (
            <BookingSlotPicker
                timezone={organization.timezone}
                date={search.date}
                slots={slots}
                onDateChange={(date) => onSearchChange({ date })}
                onSlotSelect={setSelectedSlot}
                onBack={() =>
                    onSearchChange({
                        professional: undefined,
                        service: undefined,
                    })
                }
            />
        );
    }

    return (
        <BookingSelectionStep
            professionals={professionals}
            selection={search}
            onChange={onSearchChange}
        />
    );
}
