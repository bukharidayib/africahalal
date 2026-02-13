export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_invitations: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role_id: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role_id: string
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role_id?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_system_role: boolean | null
          name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_system_role?: boolean | null
          name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_system_role?: boolean | null
          name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      application_documents: {
        Row: {
          application_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          application_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_at?: string
          uploaded_by: string
          version?: number
        }
        Update: {
          application_id?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "certification_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_products: {
        Row: {
          application_id: string
          brand: string
          category: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          application_id: string
          brand: string
          category?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          application_id?: string
          brand?: string
          category?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_products_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "certification_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          application_id: string
          changed_by: string
          created_at: string
          from_status: Database["public"]["Enums"]["application_status"] | null
          id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          application_id: string
          changed_by: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["application_status"] | null
          id?: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          application_id?: string
          changed_by?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["application_status"] | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "certification_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          application_id: string
          approval_notes: string | null
          approver_id: string | null
          created_at: string
          id: string
          recommendation_notes: string | null
          recommender_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          application_id: string
          approval_notes?: string | null
          approver_id?: string | null
          created_at?: string
          id?: string
          recommendation_notes?: string | null
          recommender_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          application_id?: string
          approval_notes?: string | null
          approver_id?: string | null
          created_at?: string
          id?: string
          recommendation_notes?: string | null
          recommender_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "certification_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          reason_code: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_email: string
          user_id: string
          user_role: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          reason_code?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_email: string
          user_id: string
          user_role: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          reason_code?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_email?: string
          user_id?: string
          user_role?: string
        }
        Relationships: []
      }
      blogs: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          published: boolean | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      certificate_history: {
        Row: {
          action: string
          certificate_id: string
          created_at: string
          id: string
          performed_by: string
          reason: string | null
        }
        Insert: {
          action: string
          certificate_id: string
          created_at?: string
          id?: string
          performed_by: string
          reason?: string | null
        }
        Update: {
          action?: string
          certificate_id?: string
          created_at?: string
          id?: string
          performed_by?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_history_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          application_id: string
          approved_by: string
          certificate_number: string
          created_at: string
          expiry_date: string
          id: string
          issue_date: string
          issued_by: string
          organization_id: string
          qr_hash: string
          scope: string
          status: Database["public"]["Enums"]["certificate_status"]
        }
        Insert: {
          application_id: string
          approved_by: string
          certificate_number: string
          created_at?: string
          expiry_date: string
          id?: string
          issue_date: string
          issued_by: string
          organization_id: string
          qr_hash: string
          scope: string
          status?: Database["public"]["Enums"]["certificate_status"]
        }
        Update: {
          application_id?: string
          approved_by?: string
          certificate_number?: string
          created_at?: string
          expiry_date?: string
          id?: string
          issue_date?: string
          issued_by?: string
          organization_id?: string
          qr_hash?: string
          scope?: string
          status?: Database["public"]["Enums"]["certificate_status"]
        }
        Relationships: [
          {
            foreignKeyName: "certificates_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "certification_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_applications: {
        Row: {
          application_fee: number | null
          application_number: string
          application_type: string
          assigned_officer_id: string | null
          created_at: string
          id: string
          organization_id: string
          scope: string
          sector: string
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          updated_at: string
          validity_period: string | null
        }
        Insert: {
          application_fee?: number | null
          application_number: string
          application_type: string
          assigned_officer_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          scope: string
          sector: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
          validity_period?: string | null
        }
        Update: {
          application_fee?: number | null
          application_number?: string
          application_type?: string
          assigned_officer_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          scope?: string
          sector?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
          validity_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_decisions: {
        Row: {
          application_id: string
          created_at: string
          decision_type: Database["public"]["Enums"]["decision_type"]
          id: string
          notes: string | null
          officer_id: string
          reason_code: string
        }
        Insert: {
          application_id: string
          created_at?: string
          decision_type: Database["public"]["Enums"]["decision_type"]
          id?: string
          notes?: string | null
          officer_id: string
          reason_code: string
        }
        Update: {
          application_id?: string
          created_at?: string
          decision_type?: Database["public"]["Enums"]["decision_type"]
          id?: string
          notes?: string | null
          officer_id?: string
          reason_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_decisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "certification_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_type: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_type: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          ended_at: string | null
          id: string
          started_at: string
          status: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      client_businesses: {
        Row: {
          created_at: string
          entity_name: string
          id: string
          organization_id: string | null
          pacra_number: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_name: string
          id?: string
          organization_id?: string | null
          pacra_number: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_name?: string
          id?: string
          organization_id?: string | null
          pacra_number?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_businesses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      corrective_actions: {
        Row: {
          evidence_files: string[] | null
          id: string
          ncn_id: string
          response: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["corrective_action_status"]
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          evidence_files?: string[] | null
          id?: string
          ncn_id: string
          response: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["corrective_action_status"]
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          evidence_files?: string[] | null
          id?: string
          ncn_id?: string
          response?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["corrective_action_status"]
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "corrective_actions_ncn_id_fkey"
            columns: ["ncn_id"]
            isOneToOne: false
            referencedRelation: "non_conformance_notices"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
        }
        Insert: {
          answer: string
          category: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      inspection_reports: {
        Row: {
          attestation_timestamp: string | null
          created_at: string
          findings: Json
          id: string
          inspection_id: string
          inspector_attestation: boolean
          overall_assessment: string | null
          recommendations: string | null
          submitted_at: string | null
        }
        Insert: {
          attestation_timestamp?: string | null
          created_at?: string
          findings?: Json
          id?: string
          inspection_id: string
          inspector_attestation?: boolean
          overall_assessment?: string | null
          recommendations?: string | null
          submitted_at?: string | null
        }
        Update: {
          attestation_timestamp?: string | null
          created_at?: string
          findings?: Json
          id?: string
          inspection_id?: string
          inspector_attestation?: boolean
          overall_assessment?: string | null
          recommendations?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_reports_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: true
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          application_id: string
          assigned_at: string
          assigned_by: string
          completed_at: string | null
          created_at: string
          id: string
          inspector_id: string
          scheduled_date: string
          scheduled_time: string | null
          status: Database["public"]["Enums"]["inspection_status"]
        }
        Insert: {
          application_id: string
          assigned_at?: string
          assigned_by: string
          completed_at?: string | null
          created_at?: string
          id?: string
          inspector_id: string
          scheduled_date: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
        }
        Update: {
          application_id?: string
          assigned_at?: string
          assigned_by?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          inspector_id?: string
          scheduled_date?: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "inspections_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "certification_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "inspectors"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_conflicts: {
        Row: {
          declared_at: string
          declared_by: string
          id: string
          inspector_id: string
          organization_id: string
          reason: string
        }
        Insert: {
          declared_at?: string
          declared_by: string
          id?: string
          inspector_id: string
          organization_id: string
          reason: string
        }
        Update: {
          declared_at?: string
          declared_by?: string
          id?: string
          inspector_id?: string
          organization_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspector_conflicts_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "inspectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspector_conflicts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspectors: {
        Row: {
          created_at: string
          id: string
          inspector_number: string
          is_active: boolean
          qualifications: string[] | null
          regions: string[] | null
          specializations: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspector_number: string
          is_active?: boolean
          qualifications?: string[] | null
          regions?: string[] | null
          specializations?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inspector_number?: string
          is_active?: boolean
          qualifications?: string[] | null
          regions?: string[] | null
          specializations?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          invoice_id: string
          metadata: Json | null
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          invoice_id: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          invoice_id?: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_activity_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          application_id: string | null
          certificate_id: string | null
          created_at: string
          currency: string
          description: string | null
          due_date: string
          fee_type: string
          id: string
          invoice_number: string
          organization_id: string
          paid_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          application_id?: string | null
          certificate_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date: string
          fee_type: string
          id?: string
          invoice_number: string
          organization_id: string
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          application_id?: string | null
          certificate_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string
          fee_type?: string
          id?: string
          invoice_number?: string
          organization_id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "certification_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      non_conformance_notices: {
        Row: {
          application_id: string
          category: string
          created_at: string
          description: string
          due_date: string
          id: string
          inspection_id: string | null
          issued_at: string
          issued_by: string
          ncn_number: string
          severity: Database["public"]["Enums"]["ncn_severity"]
          status: string
        }
        Insert: {
          application_id: string
          category: string
          created_at?: string
          description: string
          due_date: string
          id?: string
          inspection_id?: string | null
          issued_at?: string
          issued_by: string
          ncn_number: string
          severity: Database["public"]["Enums"]["ncn_severity"]
          status?: string
        }
        Update: {
          application_id?: string
          category?: string
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          inspection_id?: string | null
          issued_at?: string
          issued_by?: string
          ncn_number?: string
          severity?: Database["public"]["Enums"]["ncn_severity"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "non_conformance_notices_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "certification_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformance_notices_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_supervisors: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          organization_id: string | null
          supervisor_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          organization_id?: string | null
          supervisor_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          organization_id?: string | null
          supervisor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_supervisors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          registration_number: string
          sector: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          registration_number: string
          sector: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          registration_number?: string
          sector?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gateway_response: Json | null
          id: string
          invoice_id: string
          paid_by: string | null
          payment_method: string | null
          status: string
          transaction_reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          gateway_response?: Json | null
          id?: string
          invoice_id: string
          paid_by?: string | null
          payment_method?: string | null
          status?: string
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gateway_response?: Json | null
          id?: string
          invoice_id?: string
          paid_by?: string | null
          payment_method?: string | null
          status?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action_type: string
          category: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          action_type?: string
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          action_type?: string
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_name: string
          is_halal_certified: boolean | null
          notes: string | null
          percentage: number | null
          product_id: string
          source: string | null
          supplier_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_name: string
          is_halal_certified?: boolean | null
          notes?: string | null
          percentage?: number | null
          product_id: string
          source?: string | null
          supplier_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_name?: string
          is_halal_certified?: boolean | null
          notes?: string | null
          percentage?: number | null
          product_id?: string
          source?: string | null
          supplier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "application_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          nrc: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          nrc?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          nrc?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string | null
          role_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stage_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
          stage_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
          stage_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stage_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_permissions_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          stage_order: number
          system_code: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          stage_order: number
          system_code: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          stage_order?: number
          system_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_admin_role: {
        Args: {
          _email: string
          _role: Database["public"]["Enums"]["admin_role"]
        }
        Returns: string
      }
      can_perform_workflow_action: {
        Args: {
          _permission_code: string
          _stage_code: string
          _user_id: string
        }
        Returns: boolean
      }
      check_self_approval: {
        Args: {
          _application_id: string
          _current_stage: string
          _user_id: string
        }
        Returns: boolean
      }
      generate_application_number: { Args: never; Returns: string }
      generate_certificate_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_ncn_number: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      get_user_permissions: { Args: { _user_id: string }; Returns: string[] }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_permission: {
        Args: { _permission_code: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["admin_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _metadata?: Json
          _reason_code?: string
          _resource_id?: string
          _resource_type: string
        }
        Returns: string
      }
      validate_dual_approval: {
        Args: { _application_id: string; _approver_id: string }
        Returns: boolean
      }
      validate_stage_progression: {
        Args: { _from_stage: string; _to_stage: string }
        Returns: boolean
      }
      verify_certificate_by_id: {
        Args: { cert_id: string }
        Returns: {
          certificate_number: string
          expiry_date: string
          issue_date: string
          organization_name: string
          organization_registration_number: string
          scope: string
          status: Database["public"]["Enums"]["certificate_status"]
        }[]
      }
      verify_certificate_public: {
        Args: { cert_number: string }
        Returns: {
          certificate_number: string
          expiry_date: string
          issue_date: string
          organization_name: string
          organization_registration_number: string
          scope: string
          status: Database["public"]["Enums"]["certificate_status"]
        }[]
      }
    }
    Enums: {
      admin_role:
        | "super_admin"
        | "certification_officer"
        | "finance_officer"
        | "it_system_auditor"
      application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "awaiting_inspection"
        | "inspection_complete"
        | "pending_decision"
        | "approved"
        | "rejected"
        | "suspended"
        | "withdrawn"
      approval_status: "pending" | "approved" | "rejected"
      certificate_status: "active" | "suspended" | "revoked" | "expired"
      corrective_action_status:
        | "pending"
        | "under_review"
        | "accepted"
        | "rejected"
      decision_type:
        | "request_additional_info"
        | "issue_ncn"
        | "accept_corrective_action"
        | "reject_corrective_action"
        | "recommend_approval"
        | "recommend_rejection"
      inspection_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      ncn_severity: "minor" | "major" | "critical"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_role: [
        "super_admin",
        "certification_officer",
        "finance_officer",
        "it_system_auditor",
      ],
      application_status: [
        "draft",
        "submitted",
        "under_review",
        "awaiting_inspection",
        "inspection_complete",
        "pending_decision",
        "approved",
        "rejected",
        "suspended",
        "withdrawn",
      ],
      approval_status: ["pending", "approved", "rejected"],
      certificate_status: ["active", "suspended", "revoked", "expired"],
      corrective_action_status: [
        "pending",
        "under_review",
        "accepted",
        "rejected",
      ],
      decision_type: [
        "request_additional_info",
        "issue_ncn",
        "accept_corrective_action",
        "reject_corrective_action",
        "recommend_approval",
        "recommend_rejection",
      ],
      inspection_status: ["scheduled", "in_progress", "completed", "cancelled"],
      ncn_severity: ["minor", "major", "critical"],
    },
  },
} as const
