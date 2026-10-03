<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Province;
use App\Models\Address;
use App\Models\City;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * No address by default, so no province either; see `inProvince()`.
 *
 * @extends Factory<Organization>
 */
class OrganizationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 999999),
            'timezone' => 'America/Argentina/Buenos_Aires',
        ];
    }

    /**
     * Gives the organization an address in a new city of `$province`.
     */
    public function inProvince(Province $province): static
    {
        return $this->withAddressIn(City::factory()->inProvince($province));
    }

    /**
     * Gives the organization an address in an existing `$city`, so several
     * organizations can share one.
     */
    public function inCity(City $city): static
    {
        return $this->withAddressIn($city->id);
    }

    /**
     * @param  int|Factory<City>  $city
     */
    private function withAddressIn(int|Factory $city): static
    {
        return $this->has(Address::factory()->state(['city_id' => $city]), 'address');
    }
}
