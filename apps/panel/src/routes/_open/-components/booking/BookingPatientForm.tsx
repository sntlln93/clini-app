import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { AvailableSlot, BookingConfirmation } from '@/types/booking';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import {
    isSlotUnavailableError,
    useConfirmBooking,
} from '../../-hooks/use-confirm-booking';
import { BookingPatientFormFields } from './BookingPatientFormFields';
import {
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

            applyFormErrors(form, extractFormErrors(error), {
                'patient.name': 'patient.name',
                'patient.document_type': 'patient.document_type',
                'patient.document_number': 'patient.document_number',
                'patient.email': 'patient.email',
                'patient.phone': 'patient.phone',
            });
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-lg font-semibold">Tus datos</h1>
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
