import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import { useRedeemAccessCode } from '../-hooks/use-redeem-access-code';

export const ACCESS_CODE_DESCRIPTION =
    'Otros profesionales registraron datos de este paciente. Los ves cuando el paciente te comparte el código de su turno con vos: le llegó por email y está en el link de su turno.';

const accessCodeSchema = z.object({
    code: z.string().trim().min(1, 'Ingresá el código del paciente.'),
});

type AccessCodeValues = z.infer<typeof accessCodeSchema>;

// Above the history while another professional's records stay out of it
// (#364, ADR 0029): the history is the patient's, and the patient opens it.
export function AccessCodeCard({ patientId }: { patientId: number }) {
    const redeem = useRedeemAccessCode(patientId);
    const form = useForm<AccessCodeValues>({
        resolver: zodResolver(accessCodeSchema),
        defaultValues: { code: '' },
    });

    async function onSubmit(values: AccessCodeValues) {
        try {
            await redeem.mutateAsync(values.code);
        } catch (error) {
            applyFormErrors(
                form,
                extractFormErrors(error, {
                    'clinical_access.code_invalid': 'code',
                }),
                { code: 'code' },
            );
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registros de otros profesionales</CardTitle>
                <CardDescription>{ACCESS_CODE_DESCRIPTION}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="flex flex-wrap items-start gap-3"
                    >
                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem className="min-w-0 flex-1 basis-48">
                                    <FormLabel>Código del paciente</FormLabel>
                                    <FormControl
                                        render={
                                            <Input
                                                autoComplete="off"
                                                placeholder="ABCD-2345"
                                                maxLength={32}
                                                {...field}
                                            />
                                        }
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button
                            type="submit"
                            size="sm"
                            className="sm:mt-6"
                            disabled={
                                redeem.isPending || form.formState.isSubmitting
                            }
                        >
                            Ver registros
                        </Button>
                        {form.formState.errors.root && (
                            <p className="basis-full text-sm text-destructive">
                                {form.formState.errors.root.message}
                            </p>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
