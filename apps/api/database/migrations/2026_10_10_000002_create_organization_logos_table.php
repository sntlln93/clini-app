<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The organization's logo for its booking page and reminder mails (#239).
     * The file lives in the `media` bucket (ADR 0015); `path` is its object
     * key and `checksum` versions its public URL.
     */
    public function up(): void
    {
        Schema::create('organization_logos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('mime_type', 32);
            $table->string('path');
            $table->string('checksum', 64);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organization_logos');
    }
};
