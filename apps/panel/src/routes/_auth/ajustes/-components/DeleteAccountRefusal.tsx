type DeleteAccountRefusalProps = {
    message: string;
    /** The organizations the refusal names, where to resolve it. */
    organizations: string[];
};

/** Why the deletion was refused, and where to resolve it (#384). */
export function DeleteAccountRefusal({
    message,
    organizations,
}: DeleteAccountRefusalProps) {
    return (
        <div role="alert" className="space-y-1 text-sm text-destructive">
            <p>{message}</p>
            {organizations.length > 0 && (
                <ul className="list-disc pl-5">
                    {organizations.map((name) => (
                        <li key={name}>{name}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
