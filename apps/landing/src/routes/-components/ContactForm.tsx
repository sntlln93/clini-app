import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ContactRequest } from '@/lib/contact';
import { useState, type ChangeEvent } from 'react';
import { useContactForm } from '../-hooks/use-contact-form';
import { FormField, Honeypot, PlanField, SubmitRow } from './ContactFormFields';
import { ContactSent } from './ContactSent';
import type { PlanId } from './plans';

type TextKey = Exclude<keyof ContactRequest, 'plan'>;

/** The commercial contact form (#248): the landing's only write to the API (ADR 0011). */
export function ContactForm({ initialPlan }: { initialPlan: PlanId | null }) {
    const { state, fieldErrors, formError, submit } = useContactForm();
    const [values, setValues] = useState<ContactRequest>({
        name: '',
        email: '',
        phone: '',
        organizationName: '',
        teamSize: '',
        plan: initialPlan,
        message: '',
        website: '',
    });

    if (state.status === 'sent') {
        return <ContactSent name={state.name} email={state.email} />;
    }

    const bind = (key: TextKey) => ({
        value: values[key],
        onChange: (
            event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        ) =>
            setValues((current) => ({ ...current, [key]: event.target.value })),
    });

    return (
        <form
            noValidate
            aria-label="Formulario de contacto"
            onSubmit={(event) => {
                event.preventDefault();
                void submit(values);
            }}
            className="relative grid gap-6 rounded-3xl border bg-card p-7 shadow-card"
        >
            <FieldGroup>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FormField label="Nombre" error={fieldErrors.name}>
                        {(control) => (
                            <Input
                                {...control}
                                // 44px: the theme's touch floor only reaches the SPAs' #root.
                                className="h-11"
                                autoComplete="name"
                                maxLength={120}
                                required
                                {...bind('name')}
                            />
                        )}
                    </FormField>
                    <FormField label="Correo" error={fieldErrors.email}>
                        {(control) => (
                            <Input
                                {...control}
                                className="h-11"
                                type="email"
                                autoComplete="email"
                                maxLength={255}
                                required
                                {...bind('email')}
                            />
                        )}
                    </FormField>
                    <FormField
                        label="Teléfono (opcional)"
                        error={fieldErrors.phone}
                    >
                        {(control) => (
                            <Input
                                {...control}
                                className="h-11"
                                type="tel"
                                autoComplete="tel"
                                maxLength={40}
                                {...bind('phone')}
                            />
                        )}
                    </FormField>
                    <FormField
                        label="Consultorio o centro (opcional)"
                        error={fieldErrors.organization_name}
                    >
                        {(control) => (
                            <Input
                                {...control}
                                className="h-11"
                                autoComplete="organization"
                                maxLength={120}
                                {...bind('organizationName')}
                            />
                        )}
                    </FormField>
                    <FormField
                        label="Cantidad de profesionales (opcional)"
                        error={fieldErrors.team_size}
                    >
                        {(control) => (
                            <Input
                                {...control}
                                className="h-11"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={1000}
                                {...bind('teamSize')}
                            />
                        )}
                    </FormField>
                </div>
                <PlanField
                    value={values.plan}
                    error={fieldErrors.plan}
                    onChange={(plan) =>
                        setValues((current) => ({ ...current, plan }))
                    }
                />
                <FormField
                    label="¿En qué te podemos ayudar?"
                    error={fieldErrors.message}
                >
                    {(control) => (
                        <Textarea
                            {...control}
                            rows={5}
                            maxLength={2000}
                            required
                            {...bind('message')}
                        />
                    )}
                </FormField>
            </FieldGroup>
            <Honeypot {...bind('website')} />
            <SubmitRow submitting={state.submitting} error={formError} />
        </form>
    );
}
