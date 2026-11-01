<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Data\Holidays\HolidayData;
use App\Enums\Province;
use App\Exceptions\Holidays\HolidayProviderUnavailableException;

interface HolidayProvider
{
    /**
     * Only national holidays when `$province` is `null`, otherwise only that province's own.
     *
     * @return array<int, HolidayData>
     *
     * @throws HolidayProviderUnavailableException
     */
    public function fetch(int $year, ?Province $province): array;
}
