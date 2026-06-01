<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('todos', function (Blueprint $table) {
            if (! Schema::hasColumn('todos', 'deleted_at')) {
                $table->softDeletes();
            }

            if (! Schema::hasColumn('todos', 'is_completed')) {
                $table->boolean('is_completed')->default(false)->after('description');
            }
        });

        if (
            Schema::hasColumn('todos', 'completed')
            && Schema::hasColumn('todos', 'is_completed')
        ) {
            DB::table('todos')->update([
                'is_completed' => DB::raw('completed'),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('todos', function (Blueprint $table) {
            if (Schema::hasColumn('todos', 'deleted_at')) {
                $table->dropSoftDeletes();
            }

            if (Schema::hasColumn('todos', 'is_completed')) {
                $table->dropColumn('is_completed');
            }
        });
    }
};
