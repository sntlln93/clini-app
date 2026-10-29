/** Initials of the name, skipping titles such as "Dr." or "Dra.". */
export function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter((word) => word && !word.endsWith('.'))
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join('');
}
