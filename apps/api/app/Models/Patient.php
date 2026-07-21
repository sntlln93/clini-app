<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DocumentType;
use App\Enums\Sex;
use Database\Factories\PatientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'name',
    'email',
    'phone',
    'document_type',
    'document_number',
    'sex',
    'birth_date',
    'insurance_provider_id',
    'created_by',
])]
class Patient extends Model
{
    /** @use HasFactory<PatientFactory> */
    use HasFactory, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'document_type' => DocumentType::class,
            'sex' => Sex::class,
            'birth_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<InsuranceProvider, $this>
     */
    public function insuranceProvider(): BelongsTo
    {
        return $this->belongsTo(InsuranceProvider::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Appointment, $this>
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
