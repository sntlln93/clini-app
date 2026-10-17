<?php

declare(strict_types=1);

namespace App\Http\Requests\Subscriptions;

use App\Enums\SubscriptionBilling;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StartSubscriptionCheckoutRequest extends FormRequest
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
        return [
            // Optional: a checkout started without it is monthly, as before #240.
            'billing' => ['sometimes', Rule::enum(SubscriptionBilling::class)],
        ];
    }

    public function billing(): SubscriptionBilling
    {
        return $this->enum('billing', SubscriptionBilling::class) ?? SubscriptionBilling::Monthly;
    }
}
