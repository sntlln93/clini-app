import { useState } from 'react';
import { PasswordLoginForm } from './PasswordLoginForm';
import { TwoFactorChallengeForm } from './TwoFactorChallengeForm';

type LoginFormProps = {
    /** Internal path to return to after login; the agenda when absent. */
    redirectTo?: string;
};

/** The password, then, for an account with two-factor authentication on, its code (#357). */
export function LoginForm({ redirectTo }: LoginFormProps) {
    const [step, setStep] = useState<'password' | 'two_factor'>('password');
    const [notice, setNotice] = useState<string | null>(null);

    if (step === 'two_factor') {
        return (
            <TwoFactorChallengeForm
                redirectTo={redirectTo}
                onRestart={(message) => {
                    setNotice(message);
                    setStep('password');
                }}
            />
        );
    }

    return (
        <PasswordLoginForm
            redirectTo={redirectTo}
            notice={notice}
            onTwoFactorRequired={() => {
                setNotice(null);
                setStep('two_factor');
            }}
        />
    );
}
