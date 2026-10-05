import { cn } from '@/lib/utils';
import { useId } from 'react';

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
    label: string;
    options: Option<T>[];
    value: T;
    onChange: (value: T) => void;
    size?: 'sm' | 'md';
    className?: string;
};

/**
 * A pill-shaped single choice built on native radios, so keyboard (arrow
 * keys) and screen readers behave like any radio group.
 */
export function SegmentedControl<T extends string>({
    label,
    options,
    value,
    onChange,
    size = 'md',
    className,
}: SegmentedControlProps<T>) {
    const name = useId();

    return (
        <div
            role="radiogroup"
            aria-label={label}
            className={cn(
                'inline-grid auto-cols-fr grid-flow-col gap-1 rounded-full border bg-card p-1',
                className,
            )}
        >
            {options.map((option) => {
                const id = `${name}-${option.value}`;
                return (
                    <div key={option.value} className="relative">
                        <input
                            type="radio"
                            id={id}
                            name={name}
                            value={option.value}
                            checked={value === option.value}
                            onChange={() => onChange(option.value)}
                            // The page is server-rendered: a click before
                            // hydration checks the radio natively, and React
                            // doesn't undo it, so later clicks on it fire no
                            // `change`. `click` always fires.
                            onClick={() => onChange(option.value)}
                            className="peer absolute inset-0 cursor-pointer opacity-0"
                        />
                        <label
                            htmlFor={id}
                            className={cn(
                                'block cursor-pointer rounded-full text-center font-medium text-muted-foreground transition-colors peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                                size === 'sm'
                                    ? 'px-3 py-1 text-xs'
                                    : 'px-5 py-2 text-sm',
                            )}
                        >
                            {option.label}
                        </label>
                    </div>
                );
            })}
        </div>
    );
}
