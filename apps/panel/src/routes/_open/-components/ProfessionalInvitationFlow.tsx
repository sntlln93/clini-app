import { useState } from 'react';
import type { InvitationIdentity } from '../-hooks/use-accept-invitation';
import { InvitationAccountStep } from './InvitationAccountStep';
import { InvitationDocumentStep } from './InvitationDocumentStep';

type ProfessionalInvitationFlowProps = {
    token: string;
    lookupsLeft: number;
};

// A professional invitation (#417): the DNI first, then the account the
// registry's name goes to. Going back to the DNI happens only when what it
// found is gone, and spends another lookup.
export function ProfessionalInvitationFlow({
    token,
    lookupsLeft,
}: ProfessionalInvitationFlowProps) {
    const [identity, setIdentity] = useState<InvitationIdentity | null>(null);
    const [left, setLeft] = useState(lookupsLeft);

    if (identity === null) {
        return (
            <InvitationDocumentStep
                token={token}
                lookupsLeft={left}
                onFound={setIdentity}
            />
        );
    }

    return (
        <InvitationAccountStep
            token={token}
            identity={identity}
            onRestart={() => {
                setLeft(identity.document_lookups_left);
                setIdentity(null);
            }}
        />
    );
}
