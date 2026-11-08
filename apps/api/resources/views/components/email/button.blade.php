@props(['url'])
{{--
    The layout's button (#422): a link drawn as one, since mail clients render no <button>; dark, like the mockup. The
    link carries the padding; Outlook for Windows ignores it on an <a>, so the cell repeats it as mso-padding-alt.
--}}
@php
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
@endphp
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
<tr>
<td align="center" bgcolor="#0f1a1b" style="border-radius: 12px; background-color: #0f1a1b; mso-padding-alt: 14px 28px;">
<a href="{{ $url }}" style="display: inline-block; padding: 14px 28px; border: 1px solid #0f1a1b; border-radius: 12px; background-color: #0f1a1b; font-family: {{ $font }}; font-size: 16px; font-weight: 600; line-height: 1.25; color: #ffffff; text-decoration: none;">{{ $slot }}&nbsp;&rarr;</a>
</td>
</tr>
</table>
