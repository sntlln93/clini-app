<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * @template TData of Data
 */
interface Action
{
    /**
     * @param  TData  $dto
     */
    public function handle(Data $dto): mixed;
}
