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
     * Returns national holidays when `$province` is `null`, and national
     * plus provincial holidays when a province is given.
     *
     * @return array<int, HolidayData>
     *
     * @throws HolidayProviderUnavailableException
     */
    public function fetch(int $year, ?Province $province): array;
}
