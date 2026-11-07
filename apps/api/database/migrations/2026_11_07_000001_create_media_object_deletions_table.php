<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Objects of an uploaded-file disk that no row names anymore (a replaced or removed logo, #410), kept until
     * `deletes_at` so a database restored to an earlier point still finds the objects it names. `media:delete-due`
     * deletes them once due. Generic on purpose: any file uploaded later is scheduled here too.
     */
    public function up(): void
    {
        Schema::create('media_object_deletions', function (Blueprint $table) {
            $table->id();
            $table->string('disk', 32);
            $table->string('path');
            $table->dateTimeTz('deletes_at')->index();
            $table->timestampsTz();

            $table->unique(['disk', 'path']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('media_object_deletions');
    }
};
