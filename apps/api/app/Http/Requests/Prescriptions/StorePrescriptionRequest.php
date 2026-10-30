<?php

declare(strict_types=1);

namespace App\Http\Requests\Prescriptions;

use App\Data\Prescriptions\AllergyConfirmationData;
use App\Data\Prescriptions\PrescriptionItemData;
use Illuminate\Foundation\Http\FormRequest;

class StorePrescriptionRequest extends FormRequest
{
    public const int MAX_ITEMS = 20;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:'.self::MAX_ITEMS],
            'items.*' => ['required', 'array'],
            'items.*.medication' => ['required', 'string', 'max:255'],
            'items.*.presentation' => ['nullable', 'string', 'max:255'],
            'items.*.dosage' => ['required', 'string', 'max:500'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            // The allergies a warning listed, sent back with «Indicar igual» (#362): each version as it was shown.
            'confirmed_allergies' => ['sometimes', 'array', 'max:100'],
            'confirmed_allergies.*' => ['required', 'array'],
            'confirmed_allergies.*.version_id' => ['required', 'integer'],
            'confirmed_allergies.*.detail_shown' => ['required', 'boolean'],
        ];
    }

    /**
     * Built from the typed input accessors rather than the raw validated
     * array; validation has already guaranteed every key below exists.
     *
     * @return list<PrescriptionItemData>
     */
    public function prescriptionItems(): array
    {
        return array_map(function (int|string $key): PrescriptionItemData {
            $presentation = $this->string("items.{$key}.presentation")->trim()->toString();

            return new PrescriptionItemData(
                medication: $this->string("items.{$key}.medication")->trim()->toString(),
                presentation: $presentation === '' ? null : $presentation,
                dosage: $this->string("items.{$key}.dosage")->trim()->toString(),
                quantity: $this->integer("items.{$key}.quantity"),
            );
        }, array_keys($this->array('items')));
    }

    /**
     * @return list<AllergyConfirmationData>
     */
    public function confirmedAllergies(): array
    {
        return array_map(fn (int|string $key): AllergyConfirmationData => new AllergyConfirmationData(
            entryVersionId: $this->integer("confirmed_allergies.{$key}.version_id"),
            detailShown: $this->boolean("confirmed_allergies.{$key}.detail_shown"),
        ), array_keys($this->array('confirmed_allergies')));
    }
}
