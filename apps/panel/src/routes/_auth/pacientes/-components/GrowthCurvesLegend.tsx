import type { GrowthSex } from '@/lib/growth-standards/who-growth';
import { CENTILE_STROKES } from './growth-chart';

const ITEMS = [
    {
        label: 'Paciente',
        stroke: 'var(--chart-2)',
        width: 2,
        dash: undefined,
        dot: true,
    },
    {
        label: 'P50',
        stroke: 'var(--muted-foreground)',
        width: 1.5,
        dash: CENTILE_STROKES.p50,
    },
    {
        label: 'P15 y P85',
        stroke: 'var(--muted-foreground)',
        width: 1,
        dash: CENTILE_STROKES.p15,
    },
    {
        label: 'P3 y P97',
        stroke: 'var(--muted-foreground)',
        width: 1,
        dash: CENTILE_STROKES.p3,
    },
];

// What each line is, drawn with its own stroke, and whose curves they are.
export function GrowthCurvesLegend({ sex }: { sex: GrowthSex }) {
    return (
        <div className="space-y-1 text-xs text-muted-foreground">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {ITEMS.map((item) => (
                    <li key={item.label} className="flex items-center gap-1.5">
                        <svg
                            aria-hidden="true"
                            width="20"
                            height="8"
                            className="shrink-0"
                        >
                            <line
                                x1="0"
                                y1="4"
                                x2="20"
                                y2="4"
                                stroke={item.stroke}
                                strokeWidth={item.width}
                                strokeDasharray={item.dash}
                            />
                            {'dot' in item && (
                                <circle
                                    cx="10"
                                    cy="4"
                                    r="2.5"
                                    fill="var(--card)"
                                    stroke={item.stroke}
                                    strokeWidth={1.5}
                                />
                            )}
                        </svg>
                        {item.label}
                    </li>
                ))}
            </ul>
            <p>
                Curvas de la OMS para {sex === 'female' ? 'niñas' : 'niños'}:
                patrones de crecimiento (0 a 5 años) y referencia 2007 (5 a 19
                años).
            </p>
        </div>
    );
}
