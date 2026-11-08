@props([
    'title' => null,
    'label' => null,
    'eyebrow' => null,
    'actionUrl' => null,
    'actionText' => null,
    'note' => null,
])
{{-- The text part of Laravel's markdown mails, with the same sections as the HTML layout (#422) and its footer. --}}
<x-mail::layout>
<x-slot:header>
{{ config('brand.name') }}
</x-slot:header>
@if (filled($title))
{{ $title }}

@endif
{{ $slot }}
@if (filled($actionUrl) && filled($actionText))

{{ $actionText }}: {{ $actionUrl }}
@endif
@if (trim((string) $note) !== '')

{{ $note }}
@endif
<x-slot:footer>
{{ config('brand.name') }} · Más tiempo para atender.
</x-slot:footer>
</x-mail::layout>
