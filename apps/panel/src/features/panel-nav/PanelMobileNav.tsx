import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { brand } from '@clini/brand';
import { Menu, XIcon } from 'lucide-react';
import { useState } from 'react';
import { CHROME_HOVER, NavLinks } from './NavLinks';
import { navItems } from './nav-items';
import { useVisibleNavItems } from './use-visible-nav-items';

// Below `lg` the header has no room for the links: a button opens them in a
// drawer from the left, which closes on any link (the current page too).
export function PanelMobileNav() {
    const [open, setOpen] = useState(false);
    const items = useVisibleNavItems(navItems);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Abrir menú"
                        className={cn('lg:hidden', CHROME_HOVER)}
                    />
                }
            >
                <Menu />
            </SheetTrigger>
            <SheetContent side="left" showCloseButton={false} className="p-0">
                <SheetHeader className="flex-row items-center gap-2 border-b">
                    <BrandMark />
                    <SheetTitle className="truncate">{brand.name}</SheetTitle>
                    <SheetDescription className="sr-only">
                        Secciones del panel
                    </SheetDescription>
                    <SheetClose
                        render={
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Cerrar menú"
                                className="ml-auto"
                            />
                        }
                    >
                        <XIcon />
                    </SheetClose>
                </SheetHeader>
                <nav aria-label="Navegación principal" className="px-2">
                    <NavLinks
                        items={items}
                        orientation="vertical"
                        onNavigate={() => setOpen(false)}
                    />
                </nav>
            </SheetContent>
        </Sheet>
    );
}
