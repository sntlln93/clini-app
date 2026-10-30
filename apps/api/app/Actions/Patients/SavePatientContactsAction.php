<?php

declare(strict_types=1);

namespace App\Actions\Patients;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Patients\PatientContactData;
use App\Data\Patients\PatientContactListData;
use App\Models\PatientContact;

/**
 * Writes a patient's contacts (#365); the caller holds the patient's row lock, so two saves never race on the
 * (patient, type, value) index. A contact already on the list keeps its row and author: saving it again only moves it,
 * relabels it and, only when replacing, confirms it: the patient's form is where someone at a practice sees the whole list.
 * Adding never touches what is not given, so an anonymous booking can't drop or rewrite a contact; replacing deletes what
 * is left out.
 *
 * @implements Action<PatientContactListData>
 */
class SavePatientContactsAction implements Action
{
    /**
     * @param  PatientContactListData  $dto
     */
    public function handle(Data $dto): bool
    {
        $existing = PatientContact::query()->where('patient_id', $dto->patientId)->get()
            ->keyBy(fn (PatientContact $contact): string => $this->key($contact->type->value, $contact->value));

        $kept = [];
        $nextPosition = $dto->replace || $existing->isEmpty()
            ? 0
            : $existing->max(fn (PatientContact $contact): int => $contact->position) + 1;

        foreach ($dto->contacts as $contact) {
            $key = $this->key($contact->type->value, $contact->value);
            $current = $existing->get($key);

            if (isset($kept[$key])) {
                continue;
            }

            $kept[$key] = true;

            if ($current === null) {
                PatientContact::create([
                    'patient_id' => $dto->patientId,
                    'type' => $contact->type,
                    'value' => $contact->value,
                    'label' => $contact->label,
                    'position' => $nextPosition++,
                    'needs_confirmation' => $dto->needsConfirmation,
                    'created_by' => $dto->createdBy,
                ]);

                continue;
            }

            $this->update($current, $contact, $dto, $dto->replace ? $nextPosition++ : null);
        }

        if ($dto->replace) {
            $existing->reject(fn (PatientContact $contact, string $key): bool => isset($kept[$key]))
                ->each(fn (PatientContact $contact) => $contact->delete());
        }

        return true;
    }

    private function update(PatientContact $current, PatientContactData $contact, PatientContactListData $dto, ?int $position): void
    {
        // An anonymous booking repeating a contact the patient already has changes nothing about it.
        if ($dto->createdBy === null) {
            return;
        }

        $current->fill([
            // Adding again without a label keeps the one it had.
            'label' => $dto->replace ? $contact->label : ($contact->label ?? $current->label),
            ...($dto->replace ? ['needs_confirmation' => false] : []),
            ...($position === null ? [] : ['position' => $position]),
        ]);

        if ($current->isDirty()) {
            $current->save();
        }
    }

    private function key(string $type, string $value): string
    {
        return $type.'|'.$value;
    }
}
