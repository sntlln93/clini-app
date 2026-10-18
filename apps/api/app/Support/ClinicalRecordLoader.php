<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Patient;
use Closure;
use Illuminate\Support\LazyCollection;

/**
 * Loads what a clinical history export holds (#326, ADR 0021): the patient's appointments in the organization, every
 * note on them with all its versions, diagnoses and annulment, and only the exporting membership's own indicated
 * medication, the same records each professional can already read (CU-45, CU-53). Authors are loaded even when their
 * membership was deactivated.
 */
class ClinicalRecordLoader
{
    public const int CHUNK = 50;

    public static function patient(Patient $patient, int $organizationId, int $membershipId): Patient
    {
        return $patient->load(self::relations($organizationId, $membershipId));
    }

    /**
     * Every patient the membership attended in the organization, loaded a chunk at a time.
     *
     * @return LazyCollection<int, Patient>
     */
    public static function attendedPatients(int $organizationId, int $membershipId): LazyCollection
    {
        return Patient::query()
            ->attendedBy($organizationId, $membershipId)
            ->with(self::relations($organizationId, $membershipId))
            ->lazyById(self::CHUNK);
    }

    /**
     * A constrained relation goes before its nested ones, or Eloquent adds it unconstrained.
     *
     * @return array<int|string, string|Closure>
     */
    private static function relations(int $organizationId, int $membershipId): array
    {
        return [
            'insuranceProvider',
            'appointments' => fn ($query) => $query
                ->where('organization_id', $organizationId)
                ->orderBy('start_at')
                ->orderBy('id'),
            'appointments.membership' => fn ($query) => $query->withTrashed(),
            'appointments.membership.user',
            'appointments.service' => fn ($query) => $query->withTrashed(),
            'appointments.clinicalNotes' => fn ($query) => $query->orderBy('created_at')->orderBy('id'),
            'appointments.clinicalNotes.author.user',
            'appointments.clinicalNotes.versions.author.user',
            'appointments.clinicalNotes.versions.diagnoses',
            'appointments.clinicalNotes.annulment.author.user',
            'appointments.prescriptions' => fn ($query) => $query
                ->where('membership_id', $membershipId)
                ->orderBy('issued_at')
                ->orderBy('id'),
            'appointments.prescriptions.author.user',
            'appointments.prescriptions.versions.author.user',
            'appointments.prescriptions.versions.items',
        ];
    }
}
