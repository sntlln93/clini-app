<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Professionals\RegistryProfessionalData;
use App\Enums\HealthProfession;
use App\Models\Specialty;
use Illuminate\Database\Eloquent\Builder;

/**
 * The only writer of the specialties catalog (#387, ADR 0038): every registry answer adds the professions and
 * specialties it carries that the catalog doesn't hold yet, one row per profession and folded name, kept as the first
 * answer wrote it. A profession answered without a specialty is a row of its own, named with its label, so a license
 * always backs one row. A profession Clini doesn't know (`HealthProfession`) is left out. Rows are never changed.
 */
final class RegistrySpecialtyCatalog
{
    /**
     * @param  list<RegistryProfessionalData>  $professionals
     * @return array<string, int> the id of each row of the answer, by `key()`
     */
    public static function record(array $professionals): array
    {
        $rows = [];

        foreach ($professionals as $professional) {
            foreach ($professional->licenses as $license) {
                $profession = HealthProfession::fromRegistryName($license->profession);

                if ($profession === null) {
                    continue;
                }

                $name = self::name($profession, $license->specialty);
                $rows[self::key($profession, $name)] = [
                    'profession' => $profession->value,
                    'name' => $name,
                    'folded_name' => FoldedText::fold($name),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        if ($rows === []) {
            return [];
        }

        // Two answers may race to add the same row: the second one keeps the first one's.
        Specialty::query()->insertOrIgnore(array_values($rows));

        $ids = [];

        Specialty::query()
            ->where(function (Builder $query) use ($rows): void {
                foreach ($rows as $row) {
                    $query->orWhere(fn (Builder $query) => $query
                        ->where('profession', $row['profession'])
                        ->where('folded_name', $row['folded_name']));
                }
            })
            ->get()
            ->each(function (Specialty $specialty) use (&$ids): void {
                $ids[self::key($specialty->profession, $specialty->name)] = $specialty->id;
            });

        return $ids;
    }

    /**
     * The row a license of this profession backs, given the specialty the registry answers for it.
     */
    public static function name(HealthProfession $profession, ?string $specialty): string
    {
        return $specialty ?? $profession->label();
    }

    public static function key(HealthProfession $profession, string $name): string
    {
        return $profession->value.'|'.FoldedText::fold($name);
    }
}
