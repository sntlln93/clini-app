<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\AppointmentStatus;
use App\Exceptions\Booking\BookingAppointmentUnavailableException;
use App\Models\Appointment;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Crypt;

/** The token is the appointment id encrypted with APP_KEY: nothing stored, id hidden, validity decided on each read. */
final class AppointmentDetailsLink
{
    private const string PURPOSE = 'appointment-details:';

    public function urlOf(Appointment $appointment): string
    {
        /** @var array<int, string> $allowedOrigins */
        $allowedOrigins = config('cors.allowed_origins', []);
        $panelUrl = $allowedOrigins[0] ?? 'http://localhost:5174';

        return rtrim($panelUrl, '/').'/turno/'.$this->tokenOf($appointment);
    }

    /** Base64url, so it fits a path segment as is. */
    public function tokenOf(Appointment $appointment): string
    {
        $payload = (string) base64_decode(Crypt::encryptString(self::PURPOSE.$appointment->id), true);

        return rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
    }

    /** Same rule as the public booking routes; an undecryptable token gets the same answer, so a forged link reads as a stale one. */
    public function appointmentOf(string $token): Appointment
    {
        $id = $this->idOf($token);

        $appointment = $id === null ? null : Appointment::withoutGlobalScope('organization')
            ->whereKey($id)
            ->whereNotIn('status', [AppointmentStatus::Cancelled, AppointmentStatus::Rescheduled])
            ->where('end_at', '>', now())
            ->whereHas('organization', fn (Builder $query) => $query->whereNull('suspended_at'))
            ->first();

        if ($appointment === null) {
            throw new BookingAppointmentUnavailableException($id);
        }

        return $appointment;
    }

    private function idOf(string $token): ?int
    {
        $payload = base64_decode(strtr($token, '-_', '+/'), true);

        if ($payload === false) {
            return null;
        }

        try {
            $value = Crypt::decryptString(base64_encode($payload));
        } catch (DecryptException) {
            return null;
        }

        if (! str_starts_with($value, self::PURPOSE)) {
            return null;
        }

        $id = substr($value, strlen(self::PURPOSE));

        return ctype_digit($id) ? (int) $id : null;
    }
}
