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
import { BookingStepHeader, BookingSummary } from './BookingSummary';
import type { BookingPatientDraft } from './booking-patient-schema';

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

const SLOT_TAKEN_NOTICE = 'Ese horario se acaba de ocupar. Elegí otro.';

/**
 * Presentational only: the current step derives from the URL-owned
 * `search`, plus `selectedSlot`/`confirmation`/the patient draft, which stay
 * local because none of them parametrizes a read.
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
    const [patientDraft, setPatientDraft] = useState<BookingPatientDraft>();
    const [notice, setNotice] = useState<string>();

    const professional = professionals.find(
        (candidate) => candidate.membership_id === search.professional,
    );
    const service = professional?.services.find(
        (candidate) => candidate.id === search.service,
    );

    if (confirmation) {
        return (
            <BookingConfirmation
                confirmation={confirmation}
                timezone={organization.timezone}
                service={service}
                onBookAnother={() => {
                    setConfirmation(null);
                    setSelectedSlot(null);
                    setPatientDraft(undefined);
                    onSearchChange({
                        specialty: undefined,
                        professional: undefined,
                        service: undefined,
                        date: undefined,
                    });
                }}
            />
        );
    }

    const step = professional && service ? (selectedSlot ? 3 : 2) : 1;

    function backToGrid(draft: BookingPatientDraft, nextNotice?: string) {
        setPatientDraft(draft);
        setNotice(nextNotice);
        setSelectedSlot(null);
    }

    return (
        <div className="space-y-4">
            <BookingStepHeader
                organizationName={organization.name}
                step={step}
            />

            {professional && service && selectedSlot && (
                <BookingPatientForm
                    slug={slug}
                    membershipId={professional.membership_id}
                    serviceId={service.id}
                    slot={selectedSlot}
                    summary={
                        <BookingSummary
                            professional={professional}
                            service={service}
                            timezone={organization.timezone}
                            slot={selectedSlot}
                        />
                    }
                    defaultValues={patientDraft}
                    onBack={(draft) => backToGrid(draft)}
                    onSlotUnavailable={(draft) =>
                        backToGrid(draft, SLOT_TAKEN_NOTICE)
                    }
                    onConfirmed={setConfirmation}
                />
            )}

            {professional && service && !selectedSlot && (
                <BookingSlotPicker
                    timezone={organization.timezone}
                    date={search.date}
                    slots={slots}
                    summary={
                        <BookingSummary
                            professional={professional}
                            service={service}
                            timezone={organization.timezone}
                        />
                    }
                    notice={notice}
                    onDateChange={(date) => {
                        setNotice(undefined);
                        onSearchChange({ date });
                    }}
                    onSlotSelect={(slot) => {
                        setNotice(undefined);
                        setSelectedSlot(slot);
                    }}
                    onBack={() => {
                        setNotice(undefined);
                        onSearchChange({
                            professional: undefined,
                            service: undefined,
                        });
                    }}
                />
            )}

            {step === 1 && (
                <BookingSelectionStep
                    professionals={professionals}
                    selection={search}
                    onChange={onSearchChange}
                />
            )}
        </div>
    );
}
