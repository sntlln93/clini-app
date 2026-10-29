import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { initialsOf } from '@/lib/initials';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types/patient';
import { Link } from '@tanstack/react-router';
import { Mail, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import { mailtoHref, telHref, whatsappHref } from './contact-links';
import { ageInYears, formatAge } from './patient-age';
import { documentLabel } from './patient-labels';

type ContactAction = { label: string; href: string; icon: LucideIcon };

// The main contact (#306): the phone, to call or write by WhatsApp, or else
// the email.
function contactActions({ phone, email }: Patient): ContactAction[] {
    if (phone) {
        const whatsapp = whatsappHref(phone);

        return [
            { label: 'Llamar', href: telHref(phone), icon: Phone },
            ...(whatsapp
                ? [{ label: 'WhatsApp', href: whatsapp, icon: MessageCircle }]
                : []),
        ];
    }

    return email
        ? [{ label: 'Enviar mail', href: mailtoHref(email), icon: Mail }]
        : [];
}

// The whole card opens the patient: the name's link covers it, and the
// contact links sit above that cover.
export function PatientCard({ patient }: { patient: Patient }) {
    const actions = contactActions(patient);
    const details = [
        documentLabel(patient),
        patient.birth_date && formatAge(ageInYears(patient.birth_date)),
    ].filter(Boolean);

    return (
        <li className="min-w-0">
            <Card className="relative h-full transition-shadow has-[[data-card-link]:focus-visible]:ring-3 has-[[data-card-link]:focus-visible]:ring-ring/75 has-[[data-card-link]:hover]:shadow-md">
                <CardContent className="flex h-full flex-col gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <Avatar size="lg" aria-hidden="true">
                            <AvatarFallback>
                                {initialsOf(patient.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <Link
                                to="/pacientes/$id"
                                params={{ id: patient.id }}
                                data-card-link
                                className="block truncate font-medium outline-none after:absolute after:inset-0"
                            >
                                {patient.name}
                            </Link>
                            <p className="truncate text-muted-foreground tabular-nums">
                                {details.join(' · ')}
                            </p>
                        </div>
                    </div>
                    <div className="mt-auto flex min-w-0 flex-wrap items-center gap-2">
                        {actions.length === 0 ? (
                            <span className="text-muted-foreground">
                                Sin datos de contacto
                            </span>
                        ) : (
                            actions.map(({ label, href, icon: Icon }) => (
                                <a
                                    key={label}
                                    href={href}
                                    aria-label={`${label} a ${patient.name}`}
                                    className={cn(
                                        buttonVariants({
                                            variant: 'outline',
                                            size: 'sm',
                                        }),
                                        'relative z-10',
                                    )}
                                    {...(href.startsWith('https:')
                                        ? {
                                              target: '_blank',
                                              rel: 'noreferrer',
                                          }
                                        : {})}
                                >
                                    <Icon data-icon="inline-start" />
                                    {label}
                                </a>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </li>
    );
}
