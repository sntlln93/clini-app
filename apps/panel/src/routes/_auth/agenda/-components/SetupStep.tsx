import { Circle, CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';

type SetupStepProps = {
    title: string;
    description: string;
    /** Undefined for an optional step, which is never marked done. */
    done?: boolean;
    action?: ReactNode;
};

export function SetupStep({
    title,
    description,
    done,
    action,
}: SetupStepProps) {
    const Icon = done ? CircleCheck : Circle;

    return (
        <li className="flex gap-3">
            <Icon
                aria-hidden
                className={
                    done
                        ? 'mt-0.5 size-5 shrink-0 text-primary'
                        : 'mt-0.5 size-5 shrink-0 text-muted-foreground'
                }
            />
            <div className="min-w-0 flex-1 space-y-2">
                <div className="space-y-0.5">
                    <p
                        className={
                            done
                                ? 'font-medium text-muted-foreground line-through'
                                : 'font-medium'
                        }
                    >
                        {title}
                        {done && <span className="sr-only"> (listo)</span>}
                        {done === undefined && (
                            <span className="font-normal text-muted-foreground">
                                {' '}
                                · Opcional
                            </span>
                        )}
                    </p>
                    {!done && (
                        <p className="text-muted-foreground">{description}</p>
                    )}
                </div>
                {!done && action && (
                    <div className="flex flex-wrap gap-2">{action}</div>
                )}
            </div>
        </li>
    );
}
