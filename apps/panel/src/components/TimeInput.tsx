import { useState, type ComponentProps, type KeyboardEvent } from 'react';

import { Input } from '@/components/ui/input';
import { maskClock, parseClock, stepClock } from '@/lib/clock-text';
import { cn } from '@/lib/utils';

type TimeInputProps = Omit<
    ComponentProps<'input'>,
    'type' | 'value' | 'defaultValue' | 'onChange'
> & {
    /** «HH:MM», or '' while there's no complete time. */
    value: string;
    onChange: (value: string) => void;
    /** Leaving the field or pressing Enter, with its final value. */
    onCommit?: (value: string) => void;
    /** What the arrow keys add or take away, in minutes. */
    stepMinutes?: number;
};

/**
 * A 24-hour «HH:MM» field. The native time input follows the browser's
 * language, so in English it asks for AM/PM; this one always reads like the
 * rest of the panel. It reports a value only once the text is a complete time
 * (or '' when it's emptied or invalid on leaving), so a half-typed «9» never
 * reaches the form.
 */
export function TimeInput({
    value,
    onChange,
    onCommit,
    onBlur,
    onKeyDown,
    stepMinutes = 15,
    className,
    ...props
}: TimeInputProps) {
    const [text, setText] = useState(value);
    const [source, setSource] = useState(value);

    // A value set from outside (a reset, a drag) replaces what's typed; adjusted during render (react-hooks/set-state-in-effect).
    if (source !== value) {
        setSource(value);
        if (parseClock(text) !== value) {
            setText(value);
        }
    }

    function emit(next: string) {
        setSource(next);
        if (next !== value) {
            onChange(next);
        }
    }

    function handleChange(raw: string) {
        const masked = maskClock(raw);
        setText(masked);
        if (masked === '') {
            emit('');
        } else if (/^\d{1,2}:\d{2}$/.test(masked) || /^\d{4}$/.test(masked)) {
            const parsed = parseClock(masked);
            if (parsed !== null) {
                emit(parsed);
            }
        }
    }

    function settle(): string {
        const parsed = parseClock(text) ?? '';
        if (parsed !== '') {
            setText(parsed);
        }
        emit(parsed);

        return parsed;
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        onKeyDown?.(event);
        if (event.defaultPrevented) {
            return;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const base = parseClock(text) ?? '09:00';
            const next = stepClock(
                base,
                event.key === 'ArrowUp' ? stepMinutes : -stepMinutes,
            );
            setText(next);
            emit(next);
        } else if (event.key === 'Enter') {
            onCommit?.(settle());
        }
    }

    return (
        <Input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:MM"
            maxLength={5}
            {...props}
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            onBlur={(event) => {
                const final = settle();
                onBlur?.(event);
                onCommit?.(final);
            }}
            onKeyDown={handleKeyDown}
            className={cn('tabular-nums', className)}
        />
    );
}
