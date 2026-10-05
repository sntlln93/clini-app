import { Button } from '@/components/ui/button';
import { DateRangeFields } from '@/features/date-range/DateRangeFields';
import {
    useDateRangeDraft,
    type DateRange,
} from '@/features/date-range/use-date-range-draft';
import { FilterSelect } from '@/features/filter-select/FilterSelect';
import { AUDIT_ACTION_LABELS, AUDIT_SUBJECT_LABELS } from '@/lib/labels';
import type { AdminRef } from '@/types/admin';
import {
    AUDIT_ACTIONS,
    type AdminAuditAction,
    type AuditSubjectType,
} from '@/types/audit';
import { X } from 'lucide-react';
import { useMemo } from 'react';

const ACTION_OPTIONS = AUDIT_ACTIONS.map((action) => ({
    value: action,
    label: AUDIT_ACTION_LABELS[action],
}));

function auditRangeError({ from, to }: DateRange): string | null {
    return from && to && to < from
        ? 'La fecha “Hasta” tiene que ser igual o posterior a “Desde”.'
        : null;
}

export type AuditFilterValues = {
    action?: AdminAuditAction;
    platform_admin_id?: number;
    subject_type?: AuditSubjectType;
    subject_id?: number;
    from?: string;
    to?: string;
};

type AuditLogFiltersProps = {
    values: AuditFilterValues;
    admins: AdminRef[];
    onChange: (patch: Partial<AuditFilterValues>) => void;
};

export function AuditLogFilters({
    values,
    admins,
    onChange,
}: AuditLogFiltersProps) {
    const adminOptions = useMemo(
        () =>
            admins.map((admin) => ({
                value: String(admin.id),
                label: admin.name,
            })),
        [admins],
    );
    // A local, debounced draft: only a valid range reaches the URL, and its error is derived from the draft.
    const range = useDateRangeDraft({
        from: values.from,
        to: values.to,
        validate: auditRangeError,
        onCommit: onChange,
    });

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-start gap-4">
                <FilterSelect
                    label="Acción"
                    value={values.action}
                    options={ACTION_OPTIONS}
                    allLabel="Todas"
                    onChange={(action) => onChange({ action })}
                />
                <FilterSelect
                    label="Operador"
                    value={
                        values.platform_admin_id === undefined
                            ? undefined
                            : String(values.platform_admin_id)
                    }
                    options={adminOptions}
                    allLabel="Todos"
                    onChange={(id) =>
                        onChange({
                            platform_admin_id:
                                id === undefined ? undefined : Number(id),
                        })
                    }
                />
                <DateRangeFields
                    from={range.draft.from}
                    to={range.draft.to}
                    onChange={range.change}
                    error={range.error}
                />
            </div>
            {values.subject_type && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Sobre:</span>
                    <span className="font-medium">
                        {AUDIT_SUBJECT_LABELS[values.subject_type]}
                        {values.subject_id !== undefined &&
                            ` #${values.subject_id}`}
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                            onChange({
                                subject_type: undefined,
                                subject_id: undefined,
                            })
                        }
                    >
                        <X data-icon="inline-start" />
                        Quitar
                    </Button>
                </div>
            )}
        </div>
    );
}
