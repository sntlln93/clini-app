<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * `holidays` is a shared catalog, one row per date and scope:
     * `province_id` NULL is a national holiday, set is a provincial one.
     * Its unique key treats NULL as a value (NULLS NOT DISTINCT), so a
     * national date can't be inserted twice either. An organization's own
     * closures live apart in `organization_holidays`, which the catalog sync
     * never touches.
     */
    public function up(): void
    {
        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('name');
            $table->foreignId('province_id')->nullable()->constrained()->restrictOnDelete();
            $table->timestamps();

            $table->unique(['date', 'province_id'])->nullsNotDistinct();
        });

        Schema::create('organization_holidays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->string('name');
            $table->timestamps();

            $table->unique(['organization_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organization_holidays');
        Schema::dropIfExists('holidays');
    }
};
