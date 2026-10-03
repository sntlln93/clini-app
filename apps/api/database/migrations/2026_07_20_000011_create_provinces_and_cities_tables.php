<?php

declare(strict_types=1);

use App\Enums\Province;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The 24 province rows are reference data the app needs in every
     * environment, and production never seeds — so they are inserted here,
     * from App\Enums\Province, rather than by a seeder.
     */
    public function up(): void
    {
        Schema::create('provinces', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
        });

        DB::table('provinces')->insert(array_map(
            fn (Province $province): array => ['slug' => $province->value, 'name' => $province->label()],
            Province::cases(),
        ));

        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('province_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->timestamps();

            $table->unique(['province_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cities');
        Schema::dropIfExists('provinces');
    }
};
