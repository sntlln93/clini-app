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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->dateTimeTz('email_verified_at')->nullable();
            // Platform-operator moderation (#232): a blocked user can't log in to the panel.
            $table->dateTimeTz('blocked_at')->nullable();
            $table->string('block_reason', 500)->nullable();
            $table->string('password');
            $table->rememberToken();
            // Optional TOTP second factor (#357). The secret and the recovery
            // codes are stored encrypted (model casts); the factor is on only
            // once `two_factor_confirmed_at` is set, and the last accepted
            // time step keeps a code from being replayed inside its window.
            $table->text('two_factor_secret')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();
            $table->dateTimeTz('two_factor_confirmed_at')->nullable();
            $table->unsignedBigInteger('two_factor_last_used_step')->nullable();
            $table->string('email_verification_token')->nullable()->unique();
            $table->dateTimeTz('email_verification_token_expires_at')->nullable();
            $table->timestampsTz();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->dateTimeTz('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
