import { fireEvent, render, screen } from '@testing-library/react';
import { PencilIcon, TrashIcon } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { DataTableRowActions, type RowAction } from './DataTableRowActions';

function buildActions(count: number, overrides: Partial<RowAction>[] = []) {
    const icons = [PencilIcon, TrashIcon, PencilIcon, TrashIcon];

    return Array.from({ length: count }, (_, index) => ({
        label: `Acción ${index + 1}`,
        icon: icons[index % icons.length]!,
        onSelect: vi.fn(),
        ...overrides[index],
    }));
}

describe('DataTableRowActions', () => {
    it('renders a button per action, findable by label, with no "Más acciones" trigger for 3 actions', () => {
        const actions = buildActions(3);

        render(<DataTableRowActions actions={actions} />);

        for (const action of actions) {
            expect(
                screen.getByRole('button', { name: action.label }),
            ).not.toBeNull();
        }
        expect(
            screen.queryByRole('button', { name: 'Más acciones' }),
        ).toBeNull();
    });

    it('calls the second action onSelect exactly once when its button is clicked', () => {
        const actions = buildActions(3);

        render(<DataTableRowActions actions={actions} />);

        fireEvent.click(
            screen.getByRole('button', { name: actions[1]!.label }),
        );

        expect(actions[1]!.onSelect).toHaveBeenCalledTimes(1);
        expect(actions[0]!.onSelect).not.toHaveBeenCalled();
        expect(actions[2]!.onSelect).not.toHaveBeenCalled();
    });

    it('disables an action marked disabled and does not call onSelect when clicked', () => {
        const actions = buildActions(3, [{}, { disabled: true }, {}]);

        render(<DataTableRowActions actions={actions} />);

        const disabledButton = screen.getByRole('button', {
            name: actions[1]!.label,
        });
        expect((disabledButton as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(disabledButton);

        expect(actions[1]!.onSelect).not.toHaveBeenCalled();
    });

    it('collapses 4 actions into a single "Más acciones" trigger', () => {
        const actions = buildActions(4);

        render(<DataTableRowActions actions={actions} />);

        expect(
            screen.getByRole('button', { name: 'Más acciones' }),
        ).not.toBeNull();
        for (const action of actions) {
            expect(
                screen.queryByRole('button', { name: action.label }),
            ).toBeNull();
        }
    });

    it('shows all 4 labels after opening the "Más acciones" trigger', async () => {
        const actions = buildActions(4);

        render(<DataTableRowActions actions={actions} />);

        fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));

        for (const action of actions) {
            expect(await screen.findByText(action.label)).not.toBeNull();
        }
    });

    it('renders nothing when there are no actions', () => {
        const { container } = render(<DataTableRowActions actions={[]} />);

        expect(container.firstChild).toBeNull();
    });
});
