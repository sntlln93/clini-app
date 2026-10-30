<?php

declare(strict_types=1);

namespace App\Http\Requests\MedicalHistory;

use App\Enums\MedicalHistoryCategory;
use Illuminate\Validation\Rule;

/**
 * An allergy names its substance and may say its reaction and severity; an antecedent is free text with an optional
 * approximate date (#361).
 */
class StoreMedicalHistoryEntryRequest extends AmendMedicalHistoryEntryRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $allergy = MedicalHistoryCategory::Allergy->value;
        $rules = self::contentRules();

        return [
            'category' => ['required', Rule::enum(MedicalHistoryCategory::class)],
            ...$rules,
            'reaction' => [...$rules['reaction'], "prohibited_unless:category,{$allergy}"],
            'severity' => [...$rules['severity'], "prohibited_unless:category,{$allergy}"],
            'approximate_date' => [...$rules['approximate_date'], "prohibited_if:category,{$allergy}"],
        ];
    }

    public function category(): MedicalHistoryCategory
    {
        /** @var MedicalHistoryCategory $category */
        $category = $this->enum('category', MedicalHistoryCategory::class);

        return $category;
    }
}
