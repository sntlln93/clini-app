<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AppointmentStatus;
use App\Support\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The code a patient shares so whoever attends them reads what other professionals wrote (#364, ADR 0029). Issued for
 * one appointment, redeemed once by that appointment's professional; the redeemed row is the access, and it lasts
 * until `expires_at`, the end of the appointment's window.
 */
#[Fillable(['organization_id', 'appointment_id', 'patient_id', 'membership_id', 'code', 'expires_at', 'redeemed_at'])]
#[Hidden(['code'])]
class PatientAccessCode extends Model
{
    use BelongsToOrganization;

    public const null UPDATED_AT = null;

    /**
     * Without 0/O, 1/I/L and U, so a code read aloud or copied by hand comes out right: 30^8, about 39 bits, against
     * a redemption throttled per user and bound to the redeemer's own appointment.
     */
    public const string ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

    public const int LENGTH = 8;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'code' => 'encrypted',
            'expires_at' => 'immutable_datetime',
            'redeemed_at' => 'immutable_datetime',
        ];
    }

    /**
     * @return BelongsTo<Appointment, $this>
     */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    /**
     * Codes that still open something: their window hasn't ended and their appointment wasn't cancelled or
     * rescheduled, which brings no consultation.
     *
     * @param  Builder<PatientAccessCode>  $query
     * @return Builder<PatientAccessCode>
     */
    public function scopeValid(Builder $query): Builder
    {
        return $query->where('expires_at', '>', now()->utc())
            ->whereHas('appointment', fn (Builder $query) => $query
                ->withoutGlobalScope('organization')
                ->whereNotIn('status', [AppointmentStatus::Cancelled, AppointmentStatus::Rescheduled]));
    }

    /**
     * Shown and mailed in two groups of four, so it reads like a code and not a word.
     */
    public function formatted(): string
    {
        /** @var string $code */
        $code = $this->code;

        return substr($code, 0, 4).'-'.substr($code, 4);
    }

    /**
     * What a typed code compares as: uppercase, without the dash or any space the patient or the professional added.
     */
    public static function normalize(string $code): string
    {
        return (string) preg_replace('/[^A-Z0-9]/', '', strtoupper($code));
    }
}
