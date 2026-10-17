<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('contact_requests', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('email');
            $table->string('phone', 40)->nullable();
            $table->string('organization_name', 120)->nullable();
            $table->unsignedSmallInteger('team_size')->nullable();
            $table->string('plan')->nullable();
            $table->text('message');
            $table->string('status')->default('new');
            $table->foreignId('handled_by_id')->nullable()->constrained('platform_admins')->nullOnDelete();
            $table->dateTimeTz('closed_at')->nullable();
            $table->timestampsTz();

            $table->index(['status', 'created_at']);
            $table->index('closed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contact_requests');
    }
};
