{{-- The brand's logo atop every mail (#236), from config/brand.php. Styled alt text so the name still reads with images blocked. --}}
<p style="margin: 0 0 24px;">
    <img src="{{ config('brand.mail_logo_url') }}" alt="{{ config('brand.name') }}" height="32" style="display: block; height: 32px; width: auto; border: 0; color: #0d7179; font-family: sans-serif; font-size: 20px; font-weight: 600;">
</p>
