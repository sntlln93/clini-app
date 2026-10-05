import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('AvatarFallback contrast', () => {
    it('renders initials with text-foreground, not text-muted-foreground', () => {
        // #75: axe-core measured 4.34:1 with text-muted-foreground, below WCAG AA's 4.5:1.
        render(
            <Avatar>
                <AvatarFallback>AD</AvatarFallback>
            </Avatar>,
        );

        const classes = screen.getByText('AD').className.split(' ');
        expect(classes).toContain('text-foreground');
        expect(classes).not.toContain('text-muted-foreground');
    });

    it('keeps bg-muted and merges a caller-supplied className', () => {
        render(
            <Avatar>
                <AvatarFallback className="custom-x">AD</AvatarFallback>
            </Avatar>,
        );

        const classes = screen.getByText('AD').className.split(' ');
        expect(classes).toContain('bg-muted');
        expect(classes).toContain('custom-x');
    });
});
