import { brand, brandAssetUrl } from '@clini/brand';

const { isotype } = brand.assets;

/** The brand isotype from the manifest (#236), in the variant of the current theme. Decorative: the brand name always sits next to it. */
export function BrandMark() {
    return (
        <>
            <img
                src={brandAssetUrl(isotype.light)}
                alt=""
                className="size-8 shrink-0 dark:hidden"
            />
            <img
                src={brandAssetUrl(isotype.dark)}
                alt=""
                className="hidden size-8 shrink-0 dark:block"
            />
        </>
    );
}
