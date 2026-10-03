<?php

declare(strict_types=1);

namespace App\Http\Requests\Prescriptions;

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
            'diagnosis' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:'.self::MAX_ITEMS],
            'items.*' => ['required', 'array'],
            'items.*.medication' => ['required', 'string', 'max:255'],
            'items.*.presentation' => ['nullable', 'string', 'max:255'],
            'items.*.dosage' => ['required', 'string', 'max:500'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
        ];
    }

    public function diagnosis(): ?string
    {
        $diagnosis = $this->string('diagnosis')->trim()->toString();

        return $diagnosis === '' ? null : $diagnosis;
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
}
