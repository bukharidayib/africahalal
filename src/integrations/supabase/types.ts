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
      accountant_audit_log: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          invoice_id: string | null
          metadata: Json
          organization_id: string | null
          quotation_id: string | null
          recipient_email: string | null
          status: string
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          invoice_id?: string | null
          metadata?: Json
          organization_id?: string | null
          quotation_id?: string | null
          recipient_email?: string | null
          status?: string
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json
          organization_id?: string | null
          quotation_id?: string | null
          recipient_email?: string | null
          status?: string
        }
        Relationships: []
      }
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
      application_message_reads: {
        Row: {
          application_id: string
          id: string
          last_read_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      application_messages: {
        Row: {
          application_id: string
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          id: string
          message: string
          message_type: string
          reply_to_id: string | null
          sender_role: string
          sent_at: string
          sent_by: string
        }
        Insert: {
          application_id: string
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          id?: string
          message: string
          message_type: string
          reply_to_id?: string | null
          sender_role?: string
          sent_at?: string
          sent_by: string
        }
        Update: {
          application_id?: string
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          id?: string
          message?: string
          message_type?: string
          reply_to_id?: string | null
          sender_role?: string
          sent_at?: string
          sent_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "certification_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "application_messages"
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
          business_id: string | null
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
          business_id?: string | null
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
          business_id?: string | null
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
            foreignKeyName: "certification_applications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "client_businesses"
            referencedColumns: ["id"]
          },
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
      contact_submissions: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          subject: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          subject: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          subject?: string
        }
        Relationships: []
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
      inspection_checklist_items: {
        Row: {
          category: string
          created_at: string | null
          evidence_urls: string[] | null
          id: string
          inspection_id: string
          item_description: string
          notes: string | null
          response: string | null
          sort_order: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          evidence_urls?: string[] | null
          id?: string
          inspection_id: string
          item_description: string
          notes?: string | null
          response?: string | null
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          evidence_urls?: string[] | null
          id?: string
          inspection_id?: string
          item_description?: string
          notes?: string | null
          response?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_checklist_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_evidence: {
        Row: {
          caption: string | null
          checklist_item_id: string | null
          created_at: string | null
          file_type: string | null
          file_url: string
          id: string
          inspection_id: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          checklist_item_id?: string | null
          created_at?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          inspection_id: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          checklist_item_id?: string | null
          created_at?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          inspection_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_evidence_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_evidence_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_notifications: {
        Row: {
          created_at: string | null
          id: string
          inspection_id: string | null
          is_read: boolean | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inspection_id?: string | null
          is_read?: boolean | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inspection_id?: string | null
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_notifications_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_reports: {
        Row: {
          attestation_timestamp: string | null
          compliance_score: number | null
          created_at: string
          findings: Json
          id: string
          inspection_id: string
          inspector_attestation: boolean
          overall_assessment: string | null
          recommendations: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          attestation_timestamp?: string | null
          compliance_score?: number | null
          created_at?: string
          findings?: Json
          id?: string
          inspection_id: string
          inspector_attestation?: boolean
          overall_assessment?: string | null
          recommendations?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          attestation_timestamp?: string | null
          compliance_score?: number | null
          created_at?: string
          findings?: Json
          id?: string
          inspection_id?: string
          inspector_attestation?: boolean
          overall_assessment?: string | null
          recommendations?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
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
          notes: string | null
          scheduled_date: string
          scheduled_time: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["inspection_status"]
          supervisor_id: string | null
        }
        Insert: {
          application_id: string
          assigned_at?: string
          assigned_by: string
          completed_at?: string | null
          created_at?: string
          id?: string
          inspector_id: string
          notes?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          supervisor_id?: string | null
        }
        Update: {
          application_id?: string
          assigned_at?: string
          assigned_by?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          inspector_id?: string
          notes?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          supervisor_id?: string | null
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
      inspector_invitations: {
        Row: {
          accepted_at: string | null
          address: string | null
          cancelled_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string
          is_manager: boolean
          managed_inspector_ids: string[] | null
          nrc_number: string | null
          organization_ids: string[] | null
          regions: string[] | null
          specializations: string[] | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          address?: string | null
          cancelled_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by: string
          is_manager?: boolean
          managed_inspector_ids?: string[] | null
          nrc_number?: string | null
          organization_ids?: string[] | null
          regions?: string[] | null
          specializations?: string[] | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          address?: string | null
          cancelled_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string
          is_manager?: boolean
          managed_inspector_ids?: string[] | null
          nrc_number?: string | null
          organization_ids?: string[] | null
          regions?: string[] | null
          specializations?: string[] | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      inspector_manager_inspectors: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          inspector_id: string
          manager_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          inspector_id: string
          manager_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          inspector_id?: string
          manager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspector_manager_inspectors_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "inspectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspector_manager_inspectors_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "inspectors"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_organizations: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          inspector_id: string
          organization_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          inspector_id: string
          organization_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          inspector_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspector_organizations_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "inspectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspector_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspectors: {
        Row: {
          address: string | null
          created_at: string
          full_name: string | null
          id: string
          inspector_number: string
          is_active: boolean
          is_manager: boolean
          nrc_number: string | null
          qualifications: string[] | null
          regions: string[] | null
          specializations: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          inspector_number: string
          is_active?: boolean
          is_manager?: boolean
          nrc_number?: string | null
          qualifications?: string[] | null
          regions?: string[] | null
          specializations?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          inspector_number?: string
          is_active?: boolean
          is_manager?: boolean
          nrc_number?: string | null
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
          expiry_date: string | null
          fee_type: string
          id: string
          invoice_number: string
          organization_id: string
          paid_at: string | null
          quotation_id: string | null
          start_date: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          validity_period: string | null
        }
        Insert: {
          amount: number
          application_id?: string | null
          certificate_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date: string
          expiry_date?: string | null
          fee_type: string
          id?: string
          invoice_number: string
          organization_id: string
          paid_at?: string | null
          quotation_id?: string | null
          start_date?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          validity_period?: string | null
        }
        Update: {
          amount?: number
          application_id?: string | null
          certificate_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string
          expiry_date?: string | null
          fee_type?: string
          id?: string
          invoice_number?: string
          organization_id?: string
          paid_at?: string | null
          quotation_id?: string | null
          start_date?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          validity_period?: string | null
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
          {
            foreignKeyName: "invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
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
      offline_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_path: string
          sender_name: string
          sender_phone: string
          status: string
          submitted_by: string
          transaction_reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path: string
          sender_name: string
          sender_phone: string
          status?: string
          submitted_by: string
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string
          sender_name?: string
          sender_phone?: string
          status?: string
          submitted_by?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
          zynlepay_reference: string | null
          zynlepay_transaction_id: string | null
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
          zynlepay_reference?: string | null
          zynlepay_transaction_id?: string | null
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
          zynlepay_reference?: string | null
          zynlepay_transaction_id?: string | null
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
      quotations: {
        Row: {
          accepted_at: string | null
          application_id: string | null
          business_id: string | null
          converted_invoice_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          items: Json
          notes: string | null
          organization_id: string
          quotation_number: string
          rejected_at: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          title: string
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          application_id?: string | null
          business_id?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          items?: Json
          notes?: string | null
          organization_id: string
          quotation_number: string
          rejected_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          title: string
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          application_id?: string | null
          business_id?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          items?: Json
          notes?: string | null
          organization_id?: string
          quotation_number?: string
          rejected_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          title?: string
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "certification_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "client_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_organization_id_fkey"
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
      subscriptions: {
        Row: {
          amount: number
          application_id: string | null
          billing_cycle: string
          created_at: string
          created_by: string | null
          currency: string
          end_date: string | null
          id: string
          next_billing_date: string | null
          notes: string | null
          organization_id: string
          plan_name: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          application_id?: string | null
          billing_cycle: string
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string | null
          id?: string
          next_billing_date?: string | null
          notes?: string | null
          organization_id: string
          plan_name: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          application_id?: string | null
          billing_cycle?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string | null
          id?: string
          next_billing_date?: string | null
          notes?: string | null
          organization_id?: string
          plan_name?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "certification_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          resource_id: string | null
          resource_type: string | null
          supervisor_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          supervisor_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          supervisor_id?: string
        }
        Relationships: []
      }
      supervisor_checklist_items: {
        Row: {
          category: string
          created_at: string
          evidence_urls: string[] | null
          id: string
          item_description: string
          observation_notes: string | null
          observation_time: string | null
          report_id: string
          response: string | null
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          evidence_urls?: string[] | null
          id?: string
          item_description: string
          observation_notes?: string | null
          observation_time?: string | null
          report_id: string
          response?: string | null
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          evidence_urls?: string[] | null
          id?: string
          item_description?: string
          observation_notes?: string | null
          observation_time?: string | null
          report_id?: string
          response?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_checklist_items_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "supervisor_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_collected_ingredients: {
        Row: {
          admin_decision: string | null
          ai_classification: string | null
          ai_reasoning: string | null
          ai_risk_level: string | null
          collection_id: string
          created_at: string
          id: string
          ingredient_name: string
          notes: string | null
          percentage: number | null
          source: string | null
          supplier_name: string | null
        }
        Insert: {
          admin_decision?: string | null
          ai_classification?: string | null
          ai_reasoning?: string | null
          ai_risk_level?: string | null
          collection_id: string
          created_at?: string
          id?: string
          ingredient_name: string
          notes?: string | null
          percentage?: number | null
          source?: string | null
          supplier_name?: string | null
        }
        Update: {
          admin_decision?: string | null
          ai_classification?: string | null
          ai_reasoning?: string | null
          ai_risk_level?: string | null
          collection_id?: string
          created_at?: string
          id?: string
          ingredient_name?: string
          notes?: string | null
          percentage?: number | null
          source?: string | null
          supplier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_collected_ingredients_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "supervisor_ingredient_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_compliance_scores: {
        Row: {
          category_scores: Json
          created_at: string
          id: string
          overall_score: number
          report_id: string
          risk_level: string
          score_date: string
          site_id: string
        }
        Insert: {
          category_scores?: Json
          created_at?: string
          id?: string
          overall_score: number
          report_id: string
          risk_level: string
          score_date: string
          site_id: string
        }
        Update: {
          category_scores?: Json
          created_at?: string
          id?: string
          overall_score?: number
          report_id?: string
          risk_level?: string
          score_date?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_compliance_scores_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "supervisor_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_compliance_scores_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "supervisor_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_incidents: {
        Row: {
          created_at: string
          description: string
          evidence_urls: string[] | null
          id: string
          immediate_action_taken: string | null
          incident_number: string
          incident_type: string
          reported_at: string
          reported_by: string
          severity: string
          site_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description: string
          evidence_urls?: string[] | null
          id?: string
          immediate_action_taken?: string | null
          incident_number: string
          incident_type: string
          reported_at?: string
          reported_by: string
          severity?: string
          site_id: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string
          evidence_urls?: string[] | null
          id?: string
          immediate_action_taken?: string | null
          incident_number?: string
          incident_type?: string
          reported_at?: string
          reported_by?: string
          severity?: string
          site_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "supervisor_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_ingredient_collections: {
        Row: {
          brand: string | null
          collection_date: string
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          product_name: string
          site_id: string
          status: string
          supervisor_id: string
        }
        Insert: {
          brand?: string | null
          collection_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          product_name: string
          site_id: string
          status?: string
          supervisor_id: string
        }
        Update: {
          brand?: string | null
          collection_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          product_name?: string
          site_id?: string
          status?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_ingredient_collections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_ingredient_collections_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "supervisor_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_invitations: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string
          organization_id: string | null
          site_address: string | null
          site_name: string | null
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
          full_name?: string | null
          id?: string
          invited_by: string
          organization_id?: string | null
          site_address?: string | null
          site_name?: string | null
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
          full_name?: string | null
          id?: string
          invited_by?: string
          organization_id?: string | null
          site_address?: string | null
          site_name?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_ncrs: {
        Row: {
          category: string
          checklist_item_id: string | null
          corrective_action: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          ncr_number: string
          raised_at: string
          raised_by: string
          report_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          site_id: string
          status: string
        }
        Insert: {
          category: string
          checklist_item_id?: string | null
          corrective_action?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          ncr_number: string
          raised_at?: string
          raised_by: string
          report_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          site_id: string
          status?: string
        }
        Update: {
          category?: string
          checklist_item_id?: string | null
          corrective_action?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          ncr_number?: string
          raised_at?: string
          raised_by?: string
          report_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          site_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_ncrs_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "supervisor_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_ncrs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "supervisor_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_ncrs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "supervisor_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_observations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          observation: string
          recommendation: string | null
          report_id: string | null
          site_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          observation: string
          recommendation?: string | null
          report_id?: string | null
          site_id: string
          tag: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          observation?: string
          recommendation?: string | null
          report_id?: string | null
          site_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_observations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "supervisor_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_observations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "supervisor_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_reports: {
        Row: {
          compliance_score: number | null
          created_at: string
          id: string
          notes: string | null
          report_content: Json | null
          report_date: string
          report_type: string
          risk_level: string | null
          site_id: string
          status: string
          submitted_at: string | null
          supervisor_id: string
        }
        Insert: {
          compliance_score?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          report_content?: Json | null
          report_date?: string
          report_type: string
          risk_level?: string | null
          site_id: string
          status?: string
          submitted_at?: string | null
          supervisor_id: string
        }
        Update: {
          compliance_score?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          report_content?: Json | null
          report_date?: string
          report_type?: string
          risk_level?: string | null
          site_id?: string
          status?: string
          submitted_at?: string | null
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_reports_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "supervisor_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_sites: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          organization_id: string
          site_address: string | null
          site_name: string
          supervisor_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          site_address?: string | null
          site_name: string
          supervisor_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          site_address?: string | null
          site_name?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      expire_lapsed_applications: { Args: never; Returns: number }
      generate_application_number: { Args: never; Returns: string }
      generate_certificate_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_ncn_number: { Args: never; Returns: string }
      generate_ncr_supervisor_number: { Args: never; Returns: string }
      generate_quotation_number: { Args: never; Returns: string }
      generate_supervisor_incident_number: { Args: never; Returns: string }
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
      log_supervisor_activity: {
        Args: {
          _action: string
          _metadata?: Json
          _resource_id?: string
          _resource_type?: string
          _supervisor_id: string
        }
        Returns: string
      }
      submit_supervisor_report: { Args: { _report_id: string }; Returns: Json }
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
        | "expired"
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
        "expired",
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
