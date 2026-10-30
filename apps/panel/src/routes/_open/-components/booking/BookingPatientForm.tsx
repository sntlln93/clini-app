import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { AvailableSlot, BookingConfirmation } from '@/types/booking';
import type { InsuranceProvider } from '@/types/patient';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import {
    BOOKING_CLOSED_MESSAGE,
    isBookingClosedError,
    isMonthFullError,
    isRateLimitedError,
    isSlotUnavailableError,
    MONTH_FULL_MESSAGE,
    RATE_LIMITED_MESSAGE,
    useConfirmBooking,
} from '../../-hooks/use-confirm-booking';
import { BookingInsuranceFields } from './BookingInsuranceFields';
import { BookingPatientFormFields } from './BookingPatientFormFields';
import {
    bookingContacts,
    bookingPatientSchema,
    EMPTY_PATIENT_DRAFT,
    type BookingPatientDraft,
    type BookingPatientFormValues,
} from './booking-patient-schema';

type BookingPatientFormProps = {
    slug: string;
    membershipId: number;
    serviceId: number;
    slot: AvailableSlot;
    /** The ones the practice accepts; with none, the form doesn't ask (#291). */
    insuranceProviders: InsuranceProvider[];
    summary: ReactNode;
    /** What the patient typed last time, so going back to the grid never loses it. */
    defaultValues?: BookingPatientDraft;
    onBack: (draft: BookingPatientDraft) => void;
    onSlotUnavailable: (draft: BookingPatientDraft) => void;
    onConfirmed: (confirmation: BookingConfirmation) => void;
};

export function BookingPatientForm({
    slug,
    membershipId,
    serviceId,
    slot,
    insuranceProviders,
    summary,
    defaultValues = EMPTY_PATIENT_DRAFT,
    onBack,
    onSlotUnavailable,
    onConfirmed,
}: BookingPatientFormProps) {
    const form = useForm<BookingPatientFormValues>({
        resolver: zodResolver(bookingPatientSchema),
        defaultValues: { patient: defaultValues },
    });
    const { mutateAsync } = useConfirmBooking(slug);

    async function onSubmit(values: BookingPatientFormValues) {
        try {
            const confirmation = await mutateAsync({
                membershipId,
                serviceId,
                startAt: slot.start_at,
                patient: values.patient,
            });
            onConfirmed(confirmation);
        } catch (error) {
            // The hook already refreshed the slots by now, so the wizard can send the patient straight back to an up-to-date grid.
            if (isSlotUnavailableError(error)) {
                onSlotUnavailable(values.patient);
                return;
            }

            if (isBookingClosedError(error)) {
                form.setError('root', { message: BOOKING_CLOSED_MESSAGE });
                return;
            }

            if (isMonthFullError(error)) {
                form.setError('root', { message: MONTH_FULL_MESSAGE });
                return;
            }

            if (isRateLimitedError(error)) {
                form.setError('root', { message: RATE_LIMITED_MESSAGE });
                return;
            }

            applyFormErrors(form, extractFormErrors(error), {
                'patient.name': 'patient.name',
                'patient.document_type': 'patient.document_type',
                'patient.document_number': 'patient.document_number',
                ...Object.fromEntries(
                    bookingContacts(values.patient).fields.map(
                        (field, index) => [
                            `patient.contacts.${index}.value`,
                            field,
                        ],
                    ),
                ),
                'patient.insurance_provider_id':
                    'patient.insurance_provider_id',
                'patient.insurance_member_number':
                    'patient.insurance_member_number',
            });
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-lg tracking-tight">Tus datos</h1>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onBack(form.getValues().patient)}
                    >
                        Volver
                    </Button>
                </div>

                {summary}

                {form.formState.errors.root && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </div>
                )}

                <BookingPatientFormFields control={form.control} />

                {insuranceProviders.length > 0 && (
                    <BookingInsuranceFields
                        control={form.control}
                        insuranceProviders={insuranceProviders}
                    />
                )}

                <Button
                    type="submit"
                    className="w-full"
                    disabled={form.formState.isSubmitting}
                >
                    {form.formState.isSubmitting
                        ? 'Confirmando…'
                        : 'Confirmar turno'}
                </Button>
            </form>
        </Form>
    );
}
