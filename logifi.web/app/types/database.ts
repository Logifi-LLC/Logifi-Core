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
          tags: string[]
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
          fcv_flight_id: string | null
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
          tags?: string[]
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
          fcv_flight_id?: string | null
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
          tags?: string[]
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
          fcv_flight_id?: string | null
        }
      }
      fcv_integrations: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          created_at?: string
          updated_at?: string
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
      catalog_entity_tags: {
        Row: {
          id: string
          user_id: string
          entity_type: 'family' | 'aircraft' | 'person'
          entity_id: string
          tag: string
        }
        Insert: {
          id?: string
          user_id: string
          entity_type: 'family' | 'aircraft' | 'person'
          entity_id: string
          tag: string
        }
        Update: {
          id?: string
          user_id?: string
          entity_type?: 'family' | 'aircraft' | 'person'
          entity_id?: string
          tag?: string
        }
      }
      user_tag_presets: {
        Row: {
          id: string
          user_id: string
          tag: string
        }
        Insert: {
          id?: string
          user_id: string
          tag: string
        }
        Update: {
          id?: string
          user_id?: string
          tag?: string
        }
      }
      digifi_scan_sessions: {
        Row: {
          id: string
          user_id: string
          storage_path: string
          page_side: string
          template_name: string | null
          layout: string
          row_count: number
          model_used: string | null
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          storage_path: string
          page_side: string
          template_name?: string | null
          layout?: string
          row_count?: number
          model_used?: string | null
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          storage_path?: string
          page_side?: string
          template_name?: string | null
          layout?: string
          row_count?: number
          model_used?: string | null
          created_at?: string
          expires_at?: string
        }
      }
      digifi_capture_sessions: {
        Row: {
          id: string
          user_id: string
          token: string
          status: string
          max_photos: number
          created_at: string
          expires_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          status?: string
          max_photos?: number
          created_at?: string
          expires_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          status?: string
          max_photos?: number
          created_at?: string
          expires_at?: string
          closed_at?: string | null
        }
      }
      digifi_capture_photos: {
        Row: {
          id: string
          session_id: string
          user_id: string
          storage_path: string
          mime_type: string
          byte_size: number
          capture_source: string
          metadata: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          storage_path: string
          mime_type: string
          byte_size: number
          capture_source?: string
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          storage_path?: string
          mime_type?: string
          byte_size?: number
          capture_source?: string
          metadata?: Record<string, any>
          created_at?: string
        }
      }
      digifi_correction_feedback: {
        Row: {
          id: string
          user_id: string
          field_key: string
          raw_value: string
          raw_value_key: string
          corrected_value: string
          corrected_value_key: string
          context_key: string
          context: Record<string, any>
          sample_count: number
          created_at: string
          last_corrected_at: string
        }
        Insert: {
          id?: string
          user_id: string
          field_key: string
          raw_value: string
          raw_value_key: string
          corrected_value: string
          corrected_value_key: string
          context_key?: string
          context?: Record<string, any>
          sample_count?: number
          created_at?: string
          last_corrected_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          field_key?: string
          raw_value?: string
          raw_value_key?: string
          corrected_value?: string
          corrected_value_key?: string
          context_key?: string
          context?: Record<string, any>
          sample_count?: number
          created_at?: string
          last_corrected_at?: string
        }
      }
      logbook_builder_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          layout: string
          default_row_count: number
          columns: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          layout?: string
          default_row_count?: number
          columns?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          layout?: string
          default_row_count?: number
          columns?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
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

