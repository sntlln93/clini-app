@props([
    'title' => null,
    'label' => null,
    'eyebrow' => null,
    'actionUrl' => null,
    'actionText' => null,
    'note' => null,
])
{{--
    Laravel's markdown mails (the notifications, through vendor/notifications/email.blade.php) drawn with the one mail
    layout (#422) instead of Laravel's: the body and the note are markdown, parsed here.
--}}
<x-email.layout :title="$title" :label="$label" :eyebrow="$eyebrow" :action-url="$actionUrl" :action-text="$actionText">
{!! Illuminate\Mail\Markdown::parse((string) $slot) !!}
<x-slot:note>{!! trim((string) $note) === '' ? '' : Illuminate\Mail\Markdown::parse((string) $note) !!}</x-slot:note>
</x-email.layout>
