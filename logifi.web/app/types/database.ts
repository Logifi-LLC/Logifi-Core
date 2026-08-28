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
          pic_name: string | null
          sic_name: string | null
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
          signature_pending: boolean
          pending_instructor_id: string | null
          amends_entry_id: string | null
          is_void: boolean
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
          pic_name?: string | null
          sic_name?: string | null
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
          signature_pending?: boolean
          pending_instructor_id?: string | null
          amends_entry_id?: string | null
          is_void?: boolean
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
          pic_name?: string | null
          sic_name?: string | null
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
          signature_pending?: boolean
          pending_instructor_id?: string | null
          amends_entry_id?: string | null
          is_void?: boolean
        }
      }
      logbook_transfer_requests: {
        Row: {
          id: string
          user_id: string
          email: string
          source_app: string | null
          note: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          source_app?: string | null
          note?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          source_app?: string | null
          note?: string | null
          status?: string
          created_at?: string
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
      flica_integrations: {
        Row: {
          id: string
          user_id: string
          airline_code: string
          portal_host: string
          username: string
          password_ciphertext: string
          password_nonce: string
          key_version: number
          last_ok_at: string | null
          last_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          airline_code?: string
          portal_host?: string
          username: string
          password_ciphertext: string
          password_nonce: string
          key_version?: number
          last_ok_at?: string | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          airline_code?: string
          portal_host?: string
          username?: string
          password_ciphertext?: string
          password_nonce?: string
          key_version?: number
          last_ok_at?: string | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          entry_id: string
          user_id: string | null
          action: 'create' | 'update' | 'delete' | 'sign' | 'export' | 'restore' | 'amend' | 'supersede'
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
          action: 'create' | 'update' | 'delete' | 'sign' | 'export' | 'restore' | 'amend' | 'supersede'
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
          spread_id: string | null
          template_name: string | null
          layout: string
          row_count: number
          model_used: string | null
          scan_payload: Json | null
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          storage_path: string
          page_side: string
          spread_id?: string | null
          template_name?: string | null
          layout?: string
          row_count?: number
          model_used?: string | null
          scan_payload?: Json | null
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          storage_path?: string
          page_side?: string
          spread_id?: string | null
          template_name?: string | null
          layout?: string
          row_count?: number
          model_used?: string | null
          scan_payload?: Json | null
          created_at?: string
          expires_at?: string
        }
      }
      digifi_spread_charges: {
        Row: {
          id: string
          user_id: string
          spread_id: string
          layout: string
          credits_charged: number
          first_scan_session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          spread_id: string
          layout: string
          credits_charged?: number
          first_scan_session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          spread_id?: string
          layout?: string
          credits_charged?: number
          first_scan_session_id?: string | null
          created_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          balance_after: number
          type: string
          description: string | null
          spread_id: string | null
          payment_method: string | null
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          balance_after: number
          type: string
          description?: string | null
          spread_id?: string | null
          payment_method?: string | null
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          balance_after?: number
          type?: string
          description?: string | null
          spread_id?: string | null
          payment_method?: string | null
          reference_id?: string | null
          created_at?: string
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
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          certificate_number: string | null
          date_of_birth: string | null
          place_of_birth: string | null
          residential_address: Record<string, unknown> | null
          mailing_address: Record<string, unknown> | null
          preferences: Record<string, unknown> | null
          column_config: Record<string, unknown> | null
          credits: number
          role: 'STUDENT' | 'INSTRUCTOR' | 'DUAL'
          cfi_number: string | null
          cfi_expiration: string | null
          signing_pin_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          certificate_number?: string | null
          date_of_birth?: string | null
          place_of_birth?: string | null
          residential_address?: Record<string, unknown> | null
          mailing_address?: Record<string, unknown> | null
          preferences?: Record<string, unknown> | null
          column_config?: Record<string, unknown> | null
          credits?: number
          role?: 'STUDENT' | 'INSTRUCTOR' | 'DUAL'
          cfi_number?: string | null
          cfi_expiration?: string | null
          signing_pin_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          certificate_number?: string | null
          date_of_birth?: string | null
          place_of_birth?: string | null
          residential_address?: Record<string, unknown> | null
          mailing_address?: Record<string, unknown> | null
          preferences?: Record<string, unknown> | null
          column_config?: Record<string, unknown> | null
          credits?: number
          role?: 'STUDENT' | 'INSTRUCTOR' | 'DUAL'
          cfi_number?: string | null
          cfi_expiration?: string | null
          signing_pin_hash?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      instructor_student_relationships: {
        Row: {
          id: string
          student_id: string
          instructor_id: string
          status: 'PENDING' | 'ACTIVE' | 'REVOKED'
          relationship_kind: 'main' | 'linked'
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          instructor_id: string
          status?: 'PENDING' | 'ACTIVE' | 'REVOKED'
          relationship_kind?: 'main' | 'linked'
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          instructor_id?: string
          status?: 'PENDING' | 'ACTIVE' | 'REVOKED'
          relationship_kind?: 'main' | 'linked'
          expires_at?: string | null
          created_at?: string
        }
      }
      endorsements: {
        Row: {
          id: string
          student_id: string
          instructor_id: string | null
          template_code: string
          regulation_refs: string
          title: string
          body_template: string
          field_values: Record<string, string>
          rendered_body: string
          status: 'draft' | 'pending' | 'signed' | 'cancelled' | 'imported'
          expires_at: string | null
          signed_at: string | null
          signature_hash: string | null
          cfi_number: string | null
          cfi_expiration: string | null
          instructor_full_name: string | null
          is_imported: boolean
          import_source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          instructor_id?: string | null
          template_code: string
          regulation_refs?: string
          title: string
          body_template: string
          field_values?: Record<string, string>
          rendered_body?: string
          status?: 'draft' | 'pending' | 'signed' | 'cancelled' | 'imported'
          expires_at?: string | null
          signed_at?: string | null
          signature_hash?: string | null
          cfi_number?: string | null
          cfi_expiration?: string | null
          instructor_full_name?: string | null
          is_imported?: boolean
          import_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          instructor_id?: string | null
          template_code?: string
          regulation_refs?: string
          title?: string
          body_template?: string
          field_values?: Record<string, string>
          rendered_body?: string
          status?: 'draft' | 'pending' | 'signed' | 'cancelled' | 'imported'
          expires_at?: string | null
          signed_at?: string | null
          signature_hash?: string | null
          cfi_number?: string | null
          cfi_expiration?: string | null
          instructor_full_name?: string | null
          is_imported?: boolean
          import_source?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      flight_signatures: {
        Row: {
          id: string
          log_entry_id: string
          signer_id: string | null
          signed_at: string
          flight_data_hash: string
          signature_hash: string
          drawn_signature_url: string | null
          guest_name: string | null
          guest_certificate_number: string | null
          sign_method: 'roster_pin' | 'guest_drawn'
        }
        Insert: {
          id?: string
          log_entry_id: string
          signer_id?: string | null
          signed_at?: string
          flight_data_hash: string
          signature_hash: string
          drawn_signature_url?: string | null
          guest_name?: string | null
          guest_certificate_number?: string | null
          sign_method?: 'roster_pin' | 'guest_drawn'
        }
        Update: {
          id?: string
          log_entry_id?: string
          signer_id?: string | null
          signed_at?: string
          flight_data_hash?: string
          signature_hash?: string
          drawn_signature_url?: string | null
          guest_name?: string | null
          guest_certificate_number?: string | null
          sign_method?: 'roster_pin' | 'guest_drawn'
        }
      }
      guest_sign_sessions: {
        Row: {
          id: string
          token: string
          user_id: string
          log_entry_id: string
          status: 'pending' | 'completed' | 'expired' | 'cancelled'
          expires_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          token: string
          user_id: string
          log_entry_id: string
          status?: 'pending' | 'completed' | 'expired' | 'cancelled'
          expires_at: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          token?: string
          user_id?: string
          log_entry_id?: string
          status?: 'pending' | 'completed' | 'expired' | 'cancelled'
          expires_at?: string
          completed_at?: string | null
          created_at?: string
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
      purge_user_data_for_account_deletion: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
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
      request_instructor_link: {
        Args: {
          p_instructor_email: string
        }
        Returns: string
      }
      set_main_instructor: {
        Args: {
          p_relationship_id: string
        }
        Returns: undefined
      }
      get_roster_member_profile: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: string
          full_name: string | null
          role: 'STUDENT' | 'INSTRUCTOR' | 'DUAL'
          cfi_number: string | null
          cfi_expiration: string | null
        }[]
      }
      set_signing_pin: {
        Args: {
          p_pin: string
        }
        Returns: undefined
      }
      sign_log_entry: {
        Args: {
          p_entry_id: string
          p_instructor_id: string
          p_pin: string
        }
        Returns: string
      }
      request_endorsement: {
        Args: {
          p_instructor_id: string
          p_template_code: string
          p_title: string
          p_regulation_refs: string
          p_body_template: string
          p_field_values: Record<string, string>
          p_rendered_body: string
          p_expires_at?: string | null
        }
        Returns: string
      }
      issue_endorsement: {
        Args: {
          p_student_id: string
          p_template_code: string
          p_title: string
          p_regulation_refs: string
          p_body_template: string
          p_field_values: Record<string, string>
          p_rendered_body: string
          p_expires_at?: string | null
        }
        Returns: string
      }
      sign_endorsement: {
        Args: {
          p_endorsement_id: string
          p_pin: string
        }
        Returns: string
      }
      get_student_logbook_summary_for_instructor: {
        Args: {
          p_student_id: string
        }
        Returns: {
          entry_count: number
          total_time: number
          dual_received: number
          pic: number
          last_flight_date: string | null
        }[]
      }
      list_endorsements_for_student_as_instructor: {
        Args: {
          p_student_id: string
        }
        Returns: {
          id: string
          student_id: string
          instructor_id: string | null
          template_code: string
          regulation_refs: string
          title: string
          rendered_body: string
          status: string
          expires_at: string | null
          signed_at: string | null
          signature_hash: string | null
          cfi_number: string | null
          cfi_expiration: string | null
          instructor_full_name: string | null
          is_imported: boolean
          import_source: string | null
          created_at: string
        }[]
      }
      record_imported_endorsement: {
        Args: {
          p_template_code: string
          p_title: string
          p_regulation_refs: string
          p_body_template: string
          p_field_values: Record<string, string>
          p_rendered_body: string
          p_instructor_full_name: string
          p_cfi_number?: string | null
          p_cfi_expiration?: string | null
          p_paper_signed_at?: string | null
          p_expires_at?: string | null
        }
        Returns: string
      }
      cancel_endorsement: {
        Args: {
          p_endorsement_id: string
        }
        Returns: undefined
      }
      guest_sign_log_entry: {
        Args: {
          p_entry_id: string
          p_guest_name: string
          p_guest_certificate_number: string | null
          p_drawn_signature_url: string
        }
        Returns: string
      }
      guest_sign_log_entry_for_session: {
        Args: {
          p_session_token: string
          p_guest_name: string
          p_guest_certificate_number: string | null
          p_drawn_signature_url: string
        }
        Returns: string
      }
      list_pending_signatures_for_instructor: {
        Args: Record<string, never>
        Returns: {
          log_entry_id: string
          student_id: string
          student_name: string | null
          date: string
          departure: string
          destination: string
          registration: string
          aircraft_make_model: string
          dual_received: number
          total_time: number
          updated_at: string
          amends_entry_id: string | null
        }[]
      }
      get_pending_signature_entry: {
        Args: {
          p_entry_id: string
        }
        Returns: Record<string, unknown>
      }
      restore_log_entry_revision: {
        Args: {
          p_entry_id: string
          p_version: number
        }
        Returns: undefined
      }
    }
  }
}

