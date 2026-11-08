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
// found is gone, saying why; the same DNI is found again without spending a
// lookup.
export function ProfessionalInvitationFlow({
    token,
    lookupsLeft,
}: ProfessionalInvitationFlowProps) {
    const [identity, setIdentity] = useState<InvitationIdentity | null>(null);
    const [left, setLeft] = useState(lookupsLeft);
    const [notice, setNotice] = useState<string | null>(null);

    if (identity === null) {
        return (
            <InvitationDocumentStep
                token={token}
                lookupsLeft={left}
                notice={notice}
                onFound={(found) => {
                    setNotice(null);
                    setIdentity(found);
                }}
            />
        );
    }

    return (
        <InvitationAccountStep
            token={token}
            identity={identity}
            onRestart={(reason) => {
                setLeft(identity.document_lookups_left);
                setNotice(reason);
                setIdentity(null);
            }}
        />
    );
}
