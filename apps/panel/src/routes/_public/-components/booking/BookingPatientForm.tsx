import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { extractFormErrors } from '@/lib/form-errors';
import type { AvailableSlot, BookingConfirmation } from '@/types/booking';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useConfirmBooking } from '../../-hooks/use-confirm-booking';
import { BookingPatientFormFields } from './BookingPatientFormFields';
import {
    bookingPatientSchema,
    type BookingPatientFormValues,
} from './booking-patient-schema';

type BookingPatientFormProps = {
    slug: string;
    membershipId: number;
    serviceId: number;
    slot: AvailableSlot;
    onBack: () => void;
    onConfirmed: (confirmation: BookingConfirmation) => void;
};

export function BookingPatientForm({
    slug,
    membershipId,
    serviceId,
    slot,
    onBack,
    onConfirmed,
}: BookingPatientFormProps) {
    const form = useForm<BookingPatientFormValues>({
        resolver: zodResolver(bookingPatientSchema),
        defaultValues: {
            patient: {
                name: '',
                document_type: '',
                document_number: '',
                email: '',
                phone: '',
            },
        },
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
            const { message, errors } = extractFormErrors(error);

            for (const field of [
                'patient.name',
                'patient.document_type',
                'patient.document_number',
                'patient.email',
                'patient.phone',
            ] as const) {
                if (errors[field]) {
                    form.setError(field, { message: errors[field] });
                }
            }
            if (message) {
                form.setError('root', { message });
            }
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
                        onClick={onBack}
                    >
                        Volver
                    </Button>
                </div>

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
