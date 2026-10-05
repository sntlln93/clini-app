import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { SubscriptionStatusBadge } from '@/features/status-badges/SubscriptionStatusBadge';
import { formatDateTime } from '@/lib/format';
import { GRACE_REASON_LABELS } from '@/lib/labels';
import type { AdminSubscription } from '@/types/subscription';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

export function OrganizationSubscriptionCard({
    subscription,
}: {
    subscription: AdminSubscription | null;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Suscripción</CardTitle>
                {subscription && (
                    <CardAction>
                        <Button
                            variant="outline"
                            size="sm"
                            render={
                                <Link
                                    to="/suscripciones/$id"
                                    params={{ id: subscription.id }}
                                />
                            }
                            nativeButton={false}
                        >
                            Ver suscripción
                        </Button>
                    </CardAction>
                )}
            </CardHeader>
            <CardContent>
                {subscription === null ? (
                    <p className="text-muted-foreground">
                        Esta organización nunca inició una suscripción.
                    </p>
                ) : (
                    <dl className="divide-y">
                        <Row label="Estado">
                            <SubscriptionStatusBadge
                                status={subscription.status}
                            />
                        </Row>
                        {subscription.status === 'grace' && (
                            <>
                                <Row label="Fin de la gracia">
                                    {formatDateTime(subscription.grace_ends_at)}
                                    {subscription.grace_days_left !== null &&
                                        ` (${subscription.grace_days_left} días)`}
                                </Row>
                                <Row label="Motivo">
                                    {subscription.grace_reason
                                        ? GRACE_REASON_LABELS[
                                              subscription.grace_reason
                                          ]
                                        : '—'}
                                </Row>
                            </>
                        )}
                        <Row label="Último pago">
                            {formatDateTime(subscription.last_payment_at)}
                        </Row>
                        <Row label="Próximo cobro">
                            {formatDateTime(subscription.next_payment_at)}
                        </Row>
                    </dl>
                )}
            </CardContent>
        </Card>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{children}</dd>
        </div>
    );
}
