<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Data\Holidays\HolidayData;
use App\Enums\Province;
use App\Exceptions\Holidays\HolidayProviderUnavailableException;

/**
 * Isolates the internal schema from the raw shape of whatever external
 * holiday source is wired in (see `App\Services\Holidays`), leaving room
 * for other sources later.
 */
interface HolidayProvider
{
    /**
     * Returns only national holidays when `$province` is `null`, and only
     * that province's own holidays when one is given — each scope is
     * fetched (and stored in the catalog) on its own.
     *
     * @return array<int, HolidayData>
     *
     * @throws HolidayProviderUnavailableException
     */
    public function fetch(int $year, ?Province $province): array;
}
