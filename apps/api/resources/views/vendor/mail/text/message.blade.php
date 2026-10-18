{{-- Laravel's layout with the brand's name from config/brand.php (#236) instead of APP_NAME, and a Spanish footer. --}}
<x-mail::layout>
    {{-- Header --}}
    <x-slot:header>
        {{ config('brand.name') }}
    </x-slot:header>

    {{-- Body --}}
    {{ $slot }}

    {{-- Subcopy --}}
    @isset($subcopy)
        <x-slot:subcopy>
            <x-mail::subcopy>
                {{ $subcopy }}
            </x-mail::subcopy>
        </x-slot:subcopy>
    @endisset

    {{-- Footer --}}
    <x-slot:footer>
        <x-mail::footer>
            © {{ date('Y') }} {{ config('brand.name') }}. Todos los derechos reservados.
        </x-mail::footer>
    </x-slot:footer>
</x-mail::layout>
