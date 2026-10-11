<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The organization's logo for its booking page and reminder mails (#239),
     * kept in Postgres rather than on disk (ADR 0015). `content` is the file
     * base64-encoded; `checksum` versions its public URL.
     */
    public function up(): void
    {
        Schema::create('organization_logos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('mime_type', 32);
            $table->text('content');
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
