{{--
    Laravel's notification mail (#236, #422) on the one mail layout: the greeting is the title, the intro lines the body,
    the action the button (with its «Si el botón no funciona…» link) and the outro lines the note. A notification names
    its header label and eyebrow through ->markdown('notifications::email', ['label' => …, 'eyebrow' => …]).
--}}
<x-mail::message
    :title="! empty($greeting) ? $greeting : ($level === 'error' ? '¡Ups!' : '¡Hola!')"
    :label="$label ?? null"
    :eyebrow="$eyebrow ?? null"
    :action-url="$actionUrl ?? null"
    :action-text="$actionText ?? null"
>
@foreach ($introLines as $line)
{{ $line }}

@endforeach
@if (! empty($salutation))
{{ $salutation }}
@endif
<x-slot:note>
@foreach ($outroLines as $line)
{{ $line }}

@endforeach
</x-slot:note>
</x-mail::message>
