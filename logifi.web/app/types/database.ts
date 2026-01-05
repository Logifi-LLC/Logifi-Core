// This will be auto-generated from your Supabase schema
// For now, it's a placeholder
// Later, you can generate types using: npx supabase gen types typescript --project-id your-project-id > app/types/database.ts

export type Database = {
  public: {
    Tables: {
      log_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          role: string
          aircraft_category_class: string
          category_class_time: number | null
          aircraft_make_model: string
          registration: string
          flight_number: string | null
          departure: string
          destination: string
          route: string | null
          training_elements: string | null
          training_instructor: string | null
          instructor_certificate: string | null
          flight_conditions: string[]
          remarks: string | null
          flight_time: Record<string, any>
          performance: Record<string, any>
          oooi: Record<string, any> | null
          flagged: boolean
          created_at: string
          updated_at: string
          data_hash: string | null
          version: number
          is_imported: boolean
          import_source: string | null
          import_batch_id: string | null
          original_entry_date: string | null
          import_metadata: Record<string, any> | null
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          role: string
          aircraft_category_class: string
          category_class_time?: number | null
          aircraft_make_model: string
          registration: string
          flight_number?: string | null
          departure: string
          destination: string
          route?: string | null
          training_elements?: string | null
          training_instructor?: string | null
          instructor_certificate?: string | null
          flight_conditions?: string[]
          remarks?: string | null
          flight_time?: Record<string, any>
          performance?: Record<string, any>
          oooi?: Record<string, any> | null
          flagged?: boolean
          created_at?: string
          updated_at?: string
          data_hash?: string | null
          version?: number
          is_imported?: boolean
          import_source?: string | null
          import_batch_id?: string | null
          original_entry_date?: string | null
          import_metadata?: Record<string, any> | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          role?: string
          aircraft_category_class?: string
          category_class_time?: number | null
          aircraft_make_model?: string
          registration?: string
          flight_number?: string | null
          departure?: string
          destination?: string
          route?: string | null
          training_elements?: string | null
          training_instructor?: string | null
          instructor_certificate?: string | null
          flight_conditions?: string[]
          remarks?: string | null
          flight_time?: Record<string, any>
          performance?: Record<string, any>
          oooi?: Record<string, any> | null
          flagged?: boolean
          created_at?: string
          updated_at?: string
          data_hash?: string | null
          version?: number
          is_imported?: boolean
          import_source?: string | null
          import_batch_id?: string | null
          original_entry_date?: string | null
          import_metadata?: Record<string, any> | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          entry_id: string
          user_id: string | null
          action: 'create' | 'update' | 'delete' | 'sign' | 'export' | 'restore'
          old_data: Record<string, any> | null
          new_data: Record<string, any> | null
          changed_fields: string[] | null
          change_summary: string | null
          timestamp: string
          ip_address: string | null
          user_agent: string | null
          session_id: string | null
          is_compliance_event: boolean
          compliance_reason: string | null
        }
        Insert: {
          id?: string
          entry_id: string
          user_id?: string | null
          action: 'create' | 'update' | 'delete' | 'sign' | 'export' | 'restore'
          old_data?: Record<string, any> | null
          new_data?: Record<string, any> | null
          changed_fields?: string[] | null
          change_summary?: string | null
          timestamp?: string
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          is_compliance_event?: boolean
          compliance_reason?: string | null
        }
        Update: {
          id?: string
          entry_id?: string
          user_id?: string | null
          action?: 'create' | 'update' | 'delete' | 'sign' | 'export' | 'restore'
          old_data?: Record<string, any> | null
          new_data?: Record<string, any> | null
          changed_fields?: string[] | null
          change_summary?: string | null
          timestamp?: string
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          is_compliance_event?: boolean
          compliance_reason?: string | null
        }
      }
      entry_revisions: {
        Row: {
          id: string
          entry_id: string
          version: number
          entry_data: Record<string, any>
          data_hash: string
          created_at: string
          created_by: string | null
          reason: string | null
        }
        Insert: {
          id?: string
          entry_id: string
          version: number
          entry_data: Record<string, any>
          data_hash: string
          created_at?: string
          created_by?: string | null
          reason?: string | null
        }
        Update: {
          id?: string
          entry_id?: string
          version?: number
          entry_data?: Record<string, any>
          data_hash?: string
          created_at?: string
          created_by?: string | null
          reason?: string | null
        }
      }
      // Add other tables as needed
    }
    Views: {
      // Views will be added here
    }
    Functions: {
      validate_entry_integrity: {
        Args: {
          entry_uuid: string
        }
        Returns: {
          is_valid: boolean
          current_hash: string
          computed_hash: string
        }[]
      }
    }
  }
}

