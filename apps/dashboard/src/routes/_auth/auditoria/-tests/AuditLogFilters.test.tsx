import { Button } from '@/components/ui/button';
import { SEARCH_DEBOUNCE_MS } from '@/features/Searchbar';
import { renderRoute } from '@/tests/render-route';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
    AuditLogFilters,
    type AuditFilterValues,
} from '../-components/AuditLogFilters';

const RANGE_ERROR =
    'La fecha “Hasta” tiene que ser igual o posterior a “Desde”.';

/** Holds the filter values the way the URL does, plus a "Limpiar filtros" stand-in. */
function Harness({
    initial,
    onChange,
}: {
    initial: AuditFilterValues;
    onChange: (patch: Partial<AuditFilterValues>) => void;
}) {
    const [values, setValues] = useState(initial);

    return (
        <>
            <AuditLogFilters
                values={values}
                admins={[]}
                onChange={(patch) => {
                    onChange(patch);
                    setValues((prev) => ({ ...prev, ...patch }));
                }}
            />
            <Button type="button" onClick={() => setValues({})}>
                Limpiar filtros
            </Button>
        </>
    );
}

function renderFilters(initial: AuditFilterValues = {}) {
    const onChange = vi.fn();
    const result = renderRoute(
        <Harness initial={initial} onChange={onChange} />,
        { path: '/auditoria' },
    );

    return { onChange, result };
}

describe('AuditLogFilters', () => {
    it('commits a valid date range once, after the debounce', async () => {
        const { onChange, result } = renderFilters();
        await result;

        const desde = screen.getByLabelText('Desde');
        fireEvent.change(desde, { target: { value: '2026-09-02' } });
        fireEvent.change(desde, { target: { value: '2026-09-20' } });
        expect(onChange).not.toHaveBeenCalled();

        await waitFor(() =>
            expect(onChange).toHaveBeenCalledWith({
                from: '2026-09-20',
                to: undefined,
            }),
        );
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('holds back "Hasta" before "Desde" and keeps the typed value with its error', async () => {
        const { onChange, result } = renderFilters({
            from: '2026-09-10',
            to: '2026-09-20',
        });
        await result;

        fireEvent.change(screen.getByLabelText('Hasta'), {
            target: { value: '2026-09-01' },
        });

        screen.getByText(RANGE_ERROR);
        expect((screen.getByLabelText('Hasta') as HTMLInputElement).value).toBe(
            '2026-09-01',
        );
        await new Promise((resolve) =>
            setTimeout(resolve, SEARCH_DEBOUNCE_MS + 50),
        );
        expect(onChange).not.toHaveBeenCalled();
    });

    it('drops a stale range error when the filters are cleared', async () => {
        const { result } = renderFilters({
            from: '2026-09-10',
            to: '2026-09-20',
        });
        await result;

        fireEvent.change(screen.getByLabelText('Hasta'), {
            target: { value: '2026-09-01' },
        });
        screen.getByText(RANGE_ERROR);

        fireEvent.click(
            screen.getByRole('button', { name: 'Limpiar filtros' }),
        );

        expect(screen.queryByText(RANGE_ERROR)).toBeNull();
        expect((screen.getByLabelText('Desde') as HTMLInputElement).value).toBe(
            '',
        );
        expect((screen.getByLabelText('Hasta') as HTMLInputElement).value).toBe(
            '',
        );
    });
});
