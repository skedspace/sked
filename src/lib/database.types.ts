/**
 * Placeholder for Supabase-generated types.
 *
 * Run after migrations are applied:
 *   pnpm db:types
 *
 * This will generate the full Database interface from your Supabase schema.
 * See: https://supabase.com/docs/reference/javascript/nextjs/installing#generate-types
 */
export type Database = {
  public: {
    Tables: Record<string, unknown>;
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
  };
};
