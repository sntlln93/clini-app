import { REGEXP_ONLY_DIGITS } from 'input-otp';
import type { ComponentProps } from 'react';

import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from '@/components/ui/input-otp';

const TWO_FACTOR_CODE_LENGTH = 6;

type TwoFactorCodeInputProps = Omit<
    ComponentProps<typeof InputOTP>,
    'maxLength' | 'render' | 'children'
>;

// The authenticator app's code, always six digits, shown as the app does:
// two groups of three. One real input underneath, so a label, a paste and the
// browser's one-time-code autofill work as on any field.
export function TwoFactorCodeInput(props: TwoFactorCodeInputProps) {
    return (
        <InputOTP
            maxLength={TWO_FACTOR_CODE_LENGTH}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            // Some apps copy the code as «123 456».
            pasteTransformer={(text) => text.replace(/\s/g, '')}
            {...props}
        >
            <InputOTPGroup>
                {[0, 1, 2].map((index) => (
                    <InputOTPSlot
                        key={index}
                        index={index}
                        className="size-10 text-base"
                    />
                ))}
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
                {[3, 4, 5].map((index) => (
                    <InputOTPSlot
                        key={index}
                        index={index}
                        className="size-10 text-base"
                    />
                ))}
            </InputOTPGroup>
        </InputOTP>
    );
}
