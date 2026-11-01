<?php

declare(strict_types=1);

namespace App\Http\Requests\Availability;

use App\Data\Availability\AvailabilitySlotData;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The whole weekly schedule of a membership. The panel merges overlapping
 * and touching franjas of a day before sending it, so two franjas of the
 * same day that overlap or touch are rejected here instead of merged.
 */
class ReplaceWeeklyAvailabilityRequest extends FormRequest
{
    private const int MAX_SLOTS = 100;

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
            'slots' => ['present', 'list', 'max:'.self::MAX_SLOTS],
            'slots.*' => ['array'],
            'slots.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'slots.*.start_time' => ['required', 'date_format:H:i'],
            'slots.*.end_time' => ['required', 'date_format:H:i', 'after:slots.*.start_time'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'slots.max' => 'La semana admite hasta '.self::MAX_SLOTS.' franjas.',
            'slots.*.day_of_week.between' => 'El día de la semana no es válido.',
            'slots.*.start_time.date_format' => 'Ingresá la hora de inicio con el formato HH:MM.',
            'slots.*.end_time.date_format' => 'Ingresá la hora de fin con el formato HH:MM.',
            'slots.*.end_time.after' => 'La hora de fin tiene que ser posterior a la de inicio.',
        ];
    }

    /**
     * Rejects a franja that overlaps or touches an earlier one of the same
     * day. Runs after the rules even when they failed, so it only looks at
     * franjas that are well-formed on their own.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $byDay = [];

                foreach ($this->wellFormedSlots() as $index => $slot) {
                    foreach ($byDay[$slot->dayOfWeek] ?? [] as $other) {
                        if ($slot->startTime <= $other->endTime && $slot->endTime >= $other->startTime) {
                            $validator->errors()->add(
                                "slots.{$index}",
                                "Esta franja se superpone o queda pegada a la de {$other->startTime} a {$other->endTime} del mismo día.",
                            );

                            continue 2;
                        }
                    }

                    $byDay[$slot->dayOfWeek][] = $slot;
                }
            },
        ];
    }

    /**
     * @return list<AvailabilitySlotData>
     */
    public function slots(): array
    {
        return array_values($this->wellFormedSlots());
    }

    /**
     * @return array<int, AvailabilitySlotData>
     */
    private function wellFormedSlots(): array
    {
        $slots = $this->input('slots');

        if (! is_array($slots) || ! array_is_list($slots)) {
            return [];
        }

        $wellFormed = [];

        foreach ($slots as $index => $slot) {
            if (! is_array($slot)) {
                continue;
            }

            $day = filter_var($slot['day_of_week'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 6]]);
            $start = $slot['start_time'] ?? null;
            $end = $slot['end_time'] ?? null;

            if ($day === false
                || ! $this->isClockTime($start)
                || ! $this->isClockTime($end)
                || $end <= $start) {
                continue;
            }

            $wellFormed[$index] = new AvailabilitySlotData($day, $start, $end);
        }

        return $wellFormed;
    }

    /**
     * @phpstan-assert-if-true string $value
     */
    private function isClockTime(mixed $value): bool
    {
        return is_string($value) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value) === 1;
    }
}
