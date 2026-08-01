<?php

declare(strict_types=1);

namespace App\Http\Requests\Booking;

use App\Actions\Booking\ListAvailableSlotsAction;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

class SlotSearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $today = CarbonImmutable::today()->toDateString();
        $maxDate = CarbonImmutable::today()
            ->addDays(ListAvailableSlotsAction::BOOKING_WINDOW_DAYS)
            ->toDateString();

        return [
            'membership_id' => ['required', 'integer', 'exists:memberships,id'],
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'from' => ['required', 'date', "after_or_equal:{$today}", "before_or_equal:{$maxDate}"],
            'to' => ['required', 'date', 'after_or_equal:from', "before_or_equal:{$maxDate}"],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'membership_id.exists' => 'El profesional elegido no existe.',
            'service_id.exists' => 'La prestación elegida no existe.',
            'from.after_or_equal' => 'No se pueden buscar turnos en el pasado.',
            'from.before_or_equal' => 'La fecha debe estar dentro de los próximos '.ListAvailableSlotsAction::BOOKING_WINDOW_DAYS.' días.',
            'to.after_or_equal' => 'La fecha de fin debe ser posterior o igual a la de inicio.',
            'to.before_or_equal' => 'La fecha debe estar dentro de los próximos '.ListAvailableSlotsAction::BOOKING_WINDOW_DAYS.' días.',
        ];
    }
}
