export const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp';

const MAX_BYTES = 512 * 1024;

/**
 * The API's own rules (StoreOrganizationLogoRequest), checked before
 * uploading so the owner gets the message without a round trip. Dimensions
 * are left to the API, which answers in Spanish too.
 */
export function logoFileError(file: File): string | null {
    if (!LOGO_ACCEPT.split(',').includes(file.type)) {
        return 'El logo tiene que ser una imagen PNG, JPG o WebP.';
    }

    if (file.size > MAX_BYTES) {
        return 'El logo puede pesar hasta 512 KB.';
    }

    return null;
}
