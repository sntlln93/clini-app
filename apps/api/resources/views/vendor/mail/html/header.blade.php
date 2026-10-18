@props(['url'])
{{-- Replaces Laravel's header (#236): the brand's logo from config/brand.php instead of the app name, and no link to the API's root. --}}
<tr>
<td class="header">
<img src="{{ config('brand.mail_logo_url') }}" alt="{{ config('brand.name') }}" height="32" style="height: 32px; width: auto; border: 0; color: #0d7179; font-family: sans-serif; font-size: 20px; font-weight: 600;">
</td>
</tr>
