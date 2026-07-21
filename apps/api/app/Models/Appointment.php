<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Support\Concerns\BelongsToOrganization;
use Database\Factories\AppointmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'organization_id',
    'membership_id',
    'patient_id',
    'service_id',
    'created_by',
    'origin',
    'status',
    'start_at',
    'end_at',
    'reason',
    'confirmed_at',
    'arrived_at',
    'completed_at',
    'cancelled_at',
    'cancelled_by',
    'cancellation_reason',
    'rescheduled_from_id',
    'notes',
])]
class Appointment extends Model
{
    /** @use HasFactory<AppointmentFactory> */
    use BelongsToOrganization, HasFactory, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'origin' => AppointmentOrigin::class,
            'status' => AppointmentStatus::class,
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'arrived_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function membership(): BelongsTo
    {
        return $this->belongsTo(Membership::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function rescheduledFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'rescheduled_from_id');
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(Reminder::class);
    }
}
