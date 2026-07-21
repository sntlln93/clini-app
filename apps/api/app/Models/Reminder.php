<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Support\Concerns\BelongsToOrganization;
use Database\Factories\ReminderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['organization_id', 'appointment_id', 'channel', 'status', 'scheduled_at', 'sent_at'])]
class Reminder extends Model
{
    /** @use HasFactory<ReminderFactory> */
    use BelongsToOrganization, HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'channel' => ReminderChannel::class,
            'status' => ReminderStatus::class,
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
