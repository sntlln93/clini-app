import { cn } from '@/lib/utils';
import { COMPARE } from './plans';

const PLAN_NAMES = ['Gratis', 'Consultorio', 'Centro'];

export function CompareTable() {
    return (
        <div className="mt-6 overflow-x-auto rounded-3xl border bg-card shadow-card">
            <table className="w-full min-w-155 border-collapse text-sm">
                <caption className="px-5 pt-5 pb-2 text-left text-xl">
                    Comparar planes
                </caption>
                <thead>
                    <tr>
                        <td />
                        {PLAN_NAMES.map((name, index) => (
                            <th
                                key={name}
                                scope="col"
                                className={cn(
                                    'px-5 py-3 text-left font-medium',
                                    index === 1 && 'bg-accent/60',
                                )}
                            >
                                {name}
                            </th>
                        ))}
                    </tr>
                </thead>
                {COMPARE.map((group) => (
                    <tbody key={group.title}>
                        <tr>
                            <th
                                scope="rowgroup"
                                colSpan={4}
                                className="px-5 pt-4 pb-1.5 text-left text-xs font-medium text-primary"
                            >
                                {group.title}
                            </th>
                        </tr>
                        {group.rows.map((row) => (
                            <tr key={row.label} className="border-t">
                                <th
                                    scope="row"
                                    className="w-[34%] px-5 py-3 text-left font-normal text-muted-foreground"
                                >
                                    {row.label}
                                </th>
                                {row.values.map((value, index) => (
                                    <td
                                        key={PLAN_NAMES[index]}
                                        className={cn(
                                            'px-5 py-3 tabular-nums',
                                            value === 'No' &&
                                                'text-muted-foreground',
                                            index === 1 && 'bg-accent/60',
                                        )}
                                    >
                                        {value}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                ))}
            </table>
        </div>
    );
}
