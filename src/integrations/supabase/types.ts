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
        }
        Insert: {
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
        }
        Update: {
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
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_application_number: { Args: never; Returns: string }
      generate_certificate_number: { Args: never; Returns: string }
      generate_ncn_number: { Args: never; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
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
