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
      behavioral_segmentations: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_segmentations_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug?: string | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string | null
          updated_at: string | null
          user_id: string
          visible_for_media_plans: boolean | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug?: string | null
          updated_at?: string | null
          user_id: string
          visible_for_media_plans?: boolean | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string | null
          updated_at?: string | null
          user_id?: string
          visible_for_media_plans?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_change_logs: {
        Row: {
          change_date: string
          created_at: string
          creative_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          change_date?: string
          created_at?: string
          creative_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          change_date?: string
          created_at?: string
          creative_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_change_logs_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "media_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_templates: {
        Row: {
          created_at: string
          creative_type_id: string | null
          deleted_at: string | null
          dimension: string | null
          dimensions: Json | null
          duration: string | null
          environment_id: string | null
          format: string
          id: string
          is_active: boolean | null
          message: string | null
          name: string
          objective: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creative_type_id?: string | null
          deleted_at?: string | null
          dimension?: string | null
          dimensions?: Json | null
          duration?: string | null
          environment_id?: string | null
          format: string
          id?: string
          is_active?: boolean | null
          message?: string | null
          name: string
          objective?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creative_type_id?: string | null
          deleted_at?: string | null
          dimension?: string | null
          dimensions?: Json | null
          duration?: string | null
          environment_id?: string | null
          format?: string
          id?: string
          is_active?: boolean | null
          message?: string | null
          name?: string
          objective?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_templates_creative_type_id_fkey"
            columns: ["creative_type_id"]
            isOneToOne: false
            referencedRelation: "creative_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_templates_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_type_specifications: {
        Row: {
          created_at: string
          creative_type_id: string
          deleted_at: string | null
          duration_unit: string | null
          duration_value: number | null
          environment_id: string | null
          has_duration: boolean | null
          id: string
          is_active: boolean | null
          max_weight: number | null
          name: string
          updated_at: string
          user_id: string
          weight_unit: string | null
        }
        Insert: {
          created_at?: string
          creative_type_id: string
          deleted_at?: string | null
          duration_unit?: string | null
          duration_value?: number | null
          environment_id?: string | null
          has_duration?: boolean | null
          id?: string
          is_active?: boolean | null
          max_weight?: number | null
          name: string
          updated_at?: string
          user_id: string
          weight_unit?: string | null
        }
        Update: {
          created_at?: string
          creative_type_id?: string
          deleted_at?: string | null
          duration_unit?: string | null
          duration_value?: number | null
          environment_id?: string | null
          has_duration?: boolean | null
          id?: string
          is_active?: boolean | null
          max_weight?: number | null
          name?: string
          updated_at?: string
          user_id?: string
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_type_specifications_creative_type_id_fkey"
            columns: ["creative_type_id"]
            isOneToOne: false
            referencedRelation: "format_creative_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_type_specifications_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_types: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_kpis: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          unit?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_kpis_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          config: Json | null
          created_at: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          source_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          source_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          source_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      environment_members: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          environment_owner_id: string
          environment_role: Database["public"]["Enums"]["environment_role"]
          id: string
          invited_at: string | null
          invited_by: string | null
          member_user_id: string
          notify_media_resources: boolean | null
          perm_executive_dashboard:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_finance:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_library:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_plans:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_resources:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_reports:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_taxonomy:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          environment_owner_id: string
          environment_role?: Database["public"]["Enums"]["environment_role"]
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          member_user_id: string
          notify_media_resources?: boolean | null
          perm_executive_dashboard?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_finance?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_library?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_plans?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_resources?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_reports?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_taxonomy?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          environment_owner_id?: string
          environment_role?: Database["public"]["Enums"]["environment_role"]
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          member_user_id?: string
          notify_media_resources?: boolean | null
          perm_executive_dashboard?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_finance?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_library?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_plans?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_resources?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_reports?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_taxonomy?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      environment_roles: {
        Row: {
          accepted_at: string | null
          created_at: string
          environment_id: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_environment_admin: boolean
          perm_executive_dashboard:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_finance:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_library:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_plans:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_resources:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_reports:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_taxonomy:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          role_delete: boolean
          role_edit: boolean
          role_invite: boolean
          role_read: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          environment_id: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_environment_admin?: boolean
          perm_executive_dashboard?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_finance?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_library?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_plans?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_resources?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_reports?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_taxonomy?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          role_delete?: boolean
          role_edit?: boolean
          role_invite?: boolean
          role_read?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          environment_id?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_environment_admin?: boolean
          perm_executive_dashboard?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_finance?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_library?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_plans?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_resources?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_reports?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_taxonomy?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          role_delete?: boolean
          role_edit?: boolean
          role_invite?: boolean
          role_read?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "environment_roles_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      environments: {
        Row: {
          address: string | null
          cnpj: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      file_extensions: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_account_managers: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          email: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_account_managers_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_accounts: {
        Row: {
          category: string | null
          created_at: string | null
          deleted_at: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_accounts_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_campaign_projects: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_campaign_projects_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_cost_centers: {
        Row: {
          code: string
          created_at: string | null
          deleted_at: string | null
          environment_id: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_cost_centers_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_document_types: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_document_types_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_expense_classifications: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          macro_classification_id: string | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          macro_classification_id?: string | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          macro_classification_id?: string | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_expense_classifications_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expense_classifications_macro_classification_id_fkey"
            columns: ["macro_classification_id"]
            isOneToOne: false
            referencedRelation: "finance_macro_classifications"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_macro_classifications: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_macro_classifications_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_packages: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_packages_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_request_types: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_request_types_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_statuses: {
        Row: {
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_statuses_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_teams: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_teams_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_actuals: {
        Row: {
          actual_amount: number
          created_at: string | null
          dimensions_json: Json | null
          environment_id: string | null
          id: string
          import_batch_id: string | null
          media_plan_id: string
          notes: string | null
          period_end: string
          period_start: string
          source: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_amount?: number
          created_at?: string | null
          dimensions_json?: Json | null
          environment_id?: string | null
          id?: string
          import_batch_id?: string | null
          media_plan_id: string
          notes?: string | null
          period_end: string
          period_start: string
          source?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_amount?: number
          created_at?: string | null
          dimensions_json?: Json | null
          environment_id?: string | null
          id?: string
          import_batch_id?: string | null
          media_plan_id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          source?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_actuals_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_actuals_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_alert_configs: {
        Row: {
          alert_type: string
          created_at: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          threshold_days: number | null
          threshold_percentage: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          threshold_days?: number | null
          threshold_percentage?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          threshold_days?: number | null
          threshold_percentage?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_alert_configs_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_log: {
        Row: {
          action: string
          after_json: Json | null
          before_json: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          environment_id: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          environment_id?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          environment_id?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_audit_log_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_documents: {
        Row: {
          account_manager: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          attachment_urls: Json | null
          campaign_project: string | null
          cms_sent_date: string | null
          competency_month: string | null
          competency_month_erp: string | null
          contract_reference: string | null
          cost_center_code: string | null
          cost_center_name: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          document_number: string | null
          document_type: string
          due_date: string
          environment_id: string | null
          expense_classification: string | null
          financial_account: string | null
          id: string
          invoice_received_date: string | null
          issue_date: string
          macro_classification: string | null
          media_plan_id: string
          notes: string | null
          package: string | null
          product: string | null
          related_dimensions_json: Json | null
          request_type: string | null
          rir_task_number: string | null
          service_description: string | null
          status: string
          team: string | null
          updated_at: string | null
          user_id: string
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          account_manager?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          attachment_urls?: Json | null
          campaign_project?: string | null
          cms_sent_date?: string | null
          competency_month?: string | null
          competency_month_erp?: string | null
          contract_reference?: string | null
          cost_center_code?: string | null
          cost_center_name?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          document_number?: string | null
          document_type?: string
          due_date: string
          environment_id?: string | null
          expense_classification?: string | null
          financial_account?: string | null
          id?: string
          invoice_received_date?: string | null
          issue_date: string
          macro_classification?: string | null
          media_plan_id: string
          notes?: string | null
          package?: string | null
          product?: string | null
          related_dimensions_json?: Json | null
          request_type?: string | null
          rir_task_number?: string | null
          service_description?: string | null
          status?: string
          team?: string | null
          updated_at?: string | null
          user_id: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          account_manager?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          attachment_urls?: Json | null
          campaign_project?: string | null
          cms_sent_date?: string | null
          competency_month?: string | null
          competency_month_erp?: string | null
          contract_reference?: string | null
          cost_center_code?: string | null
          cost_center_name?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          document_number?: string | null
          document_type?: string
          due_date?: string
          environment_id?: string | null
          expense_classification?: string | null
          financial_account?: string | null
          id?: string
          invoice_received_date?: string | null
          issue_date?: string
          macro_classification?: string | null
          media_plan_id?: string
          notes?: string | null
          package?: string | null
          product?: string | null
          related_dimensions_json?: Json | null
          request_type?: string | null
          rir_task_number?: string | null
          service_description?: string | null
          status?: string
          team?: string | null
          updated_at?: string | null
          user_id?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_documents_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "financial_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_forecasts: {
        Row: {
          created_at: string | null
          dimensions_json: Json | null
          environment_id: string | null
          granularity: string
          id: string
          is_locked: boolean | null
          media_plan_id: string
          period_end: string
          period_start: string
          planned_amount: number
          reason: string | null
          source: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          dimensions_json?: Json | null
          environment_id?: string | null
          granularity?: string
          id?: string
          is_locked?: boolean | null
          media_plan_id: string
          period_end: string
          period_start: string
          planned_amount?: number
          reason?: string | null
          source?: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          dimensions_json?: Json | null
          environment_id?: string | null
          granularity?: string
          id?: string
          is_locked?: boolean | null
          media_plan_id?: string
          period_end?: string
          period_start?: string
          planned_amount?: number
          reason?: string | null
          source?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_forecasts_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_forecasts_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_payments: {
        Row: {
          actual_payment_date: string | null
          created_at: string | null
          deleted_at: string | null
          environment_id: string | null
          financial_document_id: string
          id: string
          installment_number: number | null
          notes: string | null
          paid_amount: number | null
          payment_method: string | null
          planned_amount: number
          planned_payment_date: string
          proof_url: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_payment_date?: string | null
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          financial_document_id: string
          id?: string
          installment_number?: number | null
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          planned_amount: number
          planned_payment_date: string
          proof_url?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_payment_date?: string | null
          created_at?: string | null
          deleted_at?: string | null
          environment_id?: string | null
          financial_document_id?: string
          id?: string
          installment_number?: number | null
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          planned_amount?: number
          planned_payment_date?: string
          proof_url?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_payments_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_financial_document_id_fkey"
            columns: ["financial_document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_revenues: {
        Row: {
          created_at: string | null
          environment_id: string | null
          id: string
          media_plan_id: string | null
          period_end: string
          period_start: string
          product_name: string | null
          revenue_amount: number
          source: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          environment_id?: string | null
          id?: string
          media_plan_id?: string | null
          period_end: string
          period_start: string
          product_name?: string | null
          revenue_amount?: number
          source?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          environment_id?: string | null
          id?: string
          media_plan_id?: string | null
          period_end?: string
          period_start?: string
          product_name?: string | null
          revenue_amount?: number
          source?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_revenues_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_revenues_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_roles: {
        Row: {
          created_at: string | null
          granted_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_vendors: {
        Row: {
          category: string | null
          created_at: string | null
          deleted_at: string | null
          document: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          payment_terms: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          document?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          payment_terms?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          document?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          payment_terms?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_vendors_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      format_creative_types: {
        Row: {
          created_at: string
          deleted_at: string | null
          environment_id: string | null
          format_id: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          environment_id?: string | null
          format_id: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          environment_id?: string | null
          format_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "format_creative_types_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "format_creative_types_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
        ]
      }
      formats: {
        Row: {
          created_at: string
          deleted_at: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          is_system: boolean
          name: string
          slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          name: string
          slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          name?: string
          slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formats_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_stages: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          is_system: boolean
          name: string
          order_index: number
          slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          name: string
          order_index?: number
          slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          name?: string
          order_index?: number
          slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_stages_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_audit_log: {
        Row: {
          action: string
          created_at: string
          email: string
          environment_id: string | null
          environment_owner_id: string | null
          id: string
          invite_type: string
          invited_by: string | null
          metadata: Json | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          email: string
          environment_id?: string | null
          environment_owner_id?: string | null
          id?: string
          invite_type: string
          invited_by?: string | null
          metadata?: Json | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          email?: string
          environment_id?: string | null
          environment_owner_id?: string | null
          id?: string
          invite_type?: string
          invited_by?: string | null
          metadata?: Json | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_audit_log_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      line_detail_insertions: {
        Row: {
          created_at: string | null
          environment_id: string | null
          id: string
          insertion_date: string
          line_detail_item_id: string
          notes: string | null
          quantity: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          environment_id?: string | null
          id?: string
          insertion_date: string
          line_detail_item_id: string
          notes?: string | null
          quantity?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          environment_id?: string | null
          id?: string
          insertion_date?: string
          line_detail_item_id?: string
          notes?: string | null
          quantity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_detail_insertions_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_detail_insertions_line_detail_item_id_fkey"
            columns: ["line_detail_item_id"]
            isOneToOne: false
            referencedRelation: "line_detail_items"
            referencedColumns: ["id"]
          },
        ]
      }
      line_detail_items: {
        Row: {
          created_at: string | null
          data: Json
          environment_id: string | null
          id: string
          is_active: boolean | null
          line_detail_id: string
          sort_order: number | null
          total_gross: number | null
          total_insertions: number | null
          total_net: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          line_detail_id: string
          sort_order?: number | null
          total_gross?: number | null
          total_insertions?: number | null
          total_net?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          line_detail_id?: string
          sort_order?: number | null
          total_gross?: number | null
          total_insertions?: number | null
          total_net?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_detail_items_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_detail_items_line_detail_id_fkey"
            columns: ["line_detail_id"]
            isOneToOne: false
            referencedRelation: "line_details"
            referencedColumns: ["id"]
          },
        ]
      }
      line_detail_types: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          field_schema: Json
          has_insertion_grid: boolean | null
          icon: string | null
          id: string
          insertion_grid_type: string | null
          is_active: boolean | null
          is_system: boolean | null
          metadata_schema: Json | null
          name: string
          slug: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          field_schema?: Json
          has_insertion_grid?: boolean | null
          icon?: string | null
          id?: string
          insertion_grid_type?: string | null
          is_active?: boolean | null
          is_system?: boolean | null
          metadata_schema?: Json | null
          name: string
          slug?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          field_schema?: Json
          has_insertion_grid?: boolean | null
          icon?: string | null
          id?: string
          insertion_grid_type?: string | null
          is_active?: boolean | null
          is_system?: boolean | null
          metadata_schema?: Json | null
          name?: string
          slug?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_detail_types_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      line_details: {
        Row: {
          created_at: string | null
          detail_type_id: string
          environment_id: string | null
          id: string
          media_line_id: string
          metadata: Json | null
          name: string | null
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          detail_type_id: string
          environment_id?: string | null
          id?: string
          media_line_id: string
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          detail_type_id?: string
          environment_id?: string | null
          id?: string
          media_line_id?: string
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_details_detail_type_id_fkey"
            columns: ["detail_type_id"]
            isOneToOne: false
            referencedRelation: "line_detail_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_details_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_details_media_line_id_fkey"
            columns: ["media_line_id"]
            isOneToOne: false
            referencedRelation: "media_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      line_targets: {
        Row: {
          created_at: string | null
          environment_id: string | null
          id: string
          media_line_id: string
          metric_name: string
          target_type: string | null
          target_value: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          environment_id?: string | null
          id?: string
          media_line_id: string
          metric_name: string
          target_type?: string | null
          target_value: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          environment_id?: string | null
          id?: string
          media_line_id?: string
          metric_name?: string
          target_type?: string | null
          target_value?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_targets_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_targets_media_line_id_fkey"
            columns: ["media_line_id"]
            isOneToOne: false
            referencedRelation: "media_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      media_creatives: {
        Row: {
          approved_date: string | null
          asset_url: string | null
          copy_text: string | null
          created_at: string | null
          creative_id: string | null
          creative_type: string | null
          environment_id: string | null
          format_id: string | null
          id: string
          media_line_id: string
          message_slug: string | null
          name: string
          notes: string | null
          opening_date: string | null
          piece_link: string | null
          production_status: string | null
          received_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_date?: string | null
          asset_url?: string | null
          copy_text?: string | null
          created_at?: string | null
          creative_id?: string | null
          creative_type?: string | null
          environment_id?: string | null
          format_id?: string | null
          id?: string
          media_line_id: string
          message_slug?: string | null
          name: string
          notes?: string | null
          opening_date?: string | null
          piece_link?: string | null
          production_status?: string | null
          received_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_date?: string | null
          asset_url?: string | null
          copy_text?: string | null
          created_at?: string | null
          creative_id?: string | null
          creative_type?: string | null
          environment_id?: string | null
          format_id?: string | null
          id?: string
          media_line_id?: string
          message_slug?: string | null
          name?: string
          notes?: string | null
          opening_date?: string | null
          piece_link?: string | null
          production_status?: string | null
          received_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_creatives_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_creatives_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_creatives_media_line_id_fkey"
            columns: ["media_line_id"]
            isOneToOne: false
            referencedRelation: "media_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      media_line_monthly_budgets: {
        Row: {
          amount: number
          created_at: string
          environment_id: string | null
          id: string
          media_line_id: string
          month_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          environment_id?: string | null
          id?: string
          media_line_id: string
          month_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          environment_id?: string | null
          id?: string
          media_line_id?: string
          month_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_line_monthly_budgets_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_line_monthly_budgets_media_line_id_fkey"
            columns: ["media_line_id"]
            isOneToOne: false
            referencedRelation: "media_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      media_lines: {
        Row: {
          budget: number | null
          budget_allocation: string | null
          channel_id: string | null
          clicks: number | null
          conversions: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          creative_template_id: string | null
          ctr: number | null
          deleted_at: string | null
          destination_url: string | null
          end_date: string | null
          environment_id: string | null
          format: string | null
          funnel_stage: string | null
          funnel_stage_id: string | null
          id: string
          impressions: number | null
          line_code: string | null
          media_plan_id: string
          medium_id: string | null
          moment_id: string | null
          notes: string | null
          objective: string | null
          objective_id: string | null
          percentage_of_plan: number | null
          placement: string | null
          platform: string
          start_date: string | null
          status_id: string | null
          subdivision_id: string | null
          target_id: string | null
          updated_at: string | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          utm_validated: boolean | null
          utm_validated_at: string | null
          utm_validated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          budget?: number | null
          budget_allocation?: string | null
          channel_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          creative_template_id?: string | null
          ctr?: number | null
          deleted_at?: string | null
          destination_url?: string | null
          end_date?: string | null
          environment_id?: string | null
          format?: string | null
          funnel_stage?: string | null
          funnel_stage_id?: string | null
          id?: string
          impressions?: number | null
          line_code?: string | null
          media_plan_id: string
          medium_id?: string | null
          moment_id?: string | null
          notes?: string | null
          objective?: string | null
          objective_id?: string | null
          percentage_of_plan?: number | null
          placement?: string | null
          platform: string
          start_date?: string | null
          status_id?: string | null
          subdivision_id?: string | null
          target_id?: string | null
          updated_at?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utm_validated?: boolean | null
          utm_validated_at?: string | null
          utm_validated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          budget?: number | null
          budget_allocation?: string | null
          channel_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          creative_template_id?: string | null
          ctr?: number | null
          deleted_at?: string | null
          destination_url?: string | null
          end_date?: string | null
          environment_id?: string | null
          format?: string | null
          funnel_stage?: string | null
          funnel_stage_id?: string | null
          id?: string
          impressions?: number | null
          line_code?: string | null
          media_plan_id?: string
          medium_id?: string | null
          moment_id?: string | null
          notes?: string | null
          objective?: string | null
          objective_id?: string | null
          percentage_of_plan?: number | null
          placement?: string | null
          platform?: string
          start_date?: string | null
          status_id?: string | null
          subdivision_id?: string | null
          target_id?: string | null
          updated_at?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utm_validated?: boolean | null
          utm_validated_at?: string | null
          utm_validated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_lines_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_lines_creative_template_id_fkey"
            columns: ["creative_template_id"]
            isOneToOne: false
            referencedRelation: "creative_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_lines_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_lines_funnel_stage_id_fkey"
            columns: ["funnel_stage_id"]
            isOneToOne: false
            referencedRelation: "funnel_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_lines_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_lines_medium_id_fkey"
            columns: ["medium_id"]
            isOneToOne: false
            referencedRelation: "mediums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_lines_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_lines_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "media_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_lines_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_lines_subdivision_id_fkey"
            columns: ["subdivision_id"]
            isOneToOne: false
            referencedRelation: "plan_subdivisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_lines_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_lines_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_objectives: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_objectives_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      media_plan_followers: {
        Row: {
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          id: string
          media_plan_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          media_plan_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          media_plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_plan_followers_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      media_plan_notification_state: {
        Row: {
          last_digest_sent_at: string | null
          last_digest_sent_by: string | null
          media_plan_id: string
          updated_at: string | null
        }
        Insert: {
          last_digest_sent_at?: string | null
          last_digest_sent_by?: string | null
          media_plan_id: string
          updated_at?: string | null
        }
        Update: {
          last_digest_sent_at?: string | null
          last_digest_sent_by?: string | null
          media_plan_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_plan_notification_state_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: true
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      media_plan_versions: {
        Row: {
          change_log: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          is_auto_backup: boolean
          media_plan_id: string
          snapshot_data: Json
          version_number: number
        }
        Insert: {
          change_log?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          is_auto_backup?: boolean
          media_plan_id: string
          snapshot_data?: Json
          version_number?: number
        }
        Update: {
          change_log?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          is_auto_backup?: boolean
          media_plan_id?: string
          snapshot_data?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_plan_versions_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      media_plans: {
        Row: {
          campaign: string | null
          client: string | null
          client_id: string | null
          created_at: string | null
          default_url: string | null
          deleted_at: string | null
          end_date: string | null
          environment_id: string | null
          funnel_order: string[] | null
          hierarchy_config: Json | null
          hierarchy_order: string[] | null
          id: string
          kpis: Json | null
          name: string
          objectives: string[] | null
          slug: string | null
          start_date: string | null
          status: string | null
          total_budget: number | null
          updated_at: string | null
          user_id: string
          utm_campaign_slug: string | null
        }
        Insert: {
          campaign?: string | null
          client?: string | null
          client_id?: string | null
          created_at?: string | null
          default_url?: string | null
          deleted_at?: string | null
          end_date?: string | null
          environment_id?: string | null
          funnel_order?: string[] | null
          hierarchy_config?: Json | null
          hierarchy_order?: string[] | null
          id?: string
          kpis?: Json | null
          name: string
          objectives?: string[] | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          total_budget?: number | null
          updated_at?: string | null
          user_id: string
          utm_campaign_slug?: string | null
        }
        Update: {
          campaign?: string | null
          client?: string | null
          client_id?: string | null
          created_at?: string | null
          default_url?: string | null
          deleted_at?: string | null
          end_date?: string | null
          environment_id?: string | null
          funnel_order?: string[] | null
          hierarchy_config?: Json | null
          hierarchy_order?: string[] | null
          id?: string
          kpis?: Json | null
          name?: string
          objectives?: string[] | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          total_budget?: number | null
          updated_at?: string | null
          user_id?: string
          utm_campaign_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plans_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      mediums: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mediums_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_visibility_settings: {
        Row: {
          id: string
          is_hidden: boolean | null
          menu_key: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          is_hidden?: boolean | null
          menu_key: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          is_hidden?: boolean | null
          menu_key?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      moments: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          is_system: boolean
          name: string
          slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          name: string
          slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          name?: string
          slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moments_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_environment_invites: {
        Row: {
          created_at: string | null
          email: string
          environment_id: string | null
          environment_owner_id: string
          environment_role: Database["public"]["Enums"]["environment_role"]
          expires_at: string | null
          id: string
          invite_token: string | null
          invite_type: string | null
          invited_by: string
          notify_media_resources: boolean | null
          perm_executive_dashboard:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_finance:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_library:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_plans:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_resources:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_reports:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_taxonomy:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          status: string
        }
        Insert: {
          created_at?: string | null
          email: string
          environment_id?: string | null
          environment_owner_id: string
          environment_role?: Database["public"]["Enums"]["environment_role"]
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          invite_type?: string | null
          invited_by: string
          notify_media_resources?: boolean | null
          perm_executive_dashboard?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_finance?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_library?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_plans?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_resources?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_reports?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_taxonomy?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          status?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          environment_id?: string | null
          environment_owner_id?: string
          environment_role?: Database["public"]["Enums"]["environment_role"]
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          invite_type?: string | null
          invited_by?: string
          notify_media_resources?: boolean | null
          perm_executive_dashboard?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_finance?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_library?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_plans?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_media_resources?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_reports?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          perm_taxonomy?:
            | Database["public"]["Enums"]["environment_permission_level"]
            | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_environment_invites_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          environment_id: string | null
          id: string
          is_resolved: boolean | null
          media_line_id: string | null
          media_plan_id: string
          message: string
          metric_value: number | null
          resolved_at: string | null
          severity: string | null
          threshold_value: number | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          environment_id?: string | null
          id?: string
          is_resolved?: boolean | null
          media_line_id?: string | null
          media_plan_id: string
          message: string
          metric_value?: number | null
          resolved_at?: string | null
          severity?: string | null
          threshold_value?: number | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          environment_id?: string | null
          id?: string
          is_resolved?: boolean | null
          media_line_id?: string | null
          media_plan_id?: string
          message?: string
          metric_value?: number | null
          resolved_at?: string | null
          severity?: string | null
          threshold_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_alerts_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_media_line_id_fkey"
            columns: ["media_line_id"]
            isOneToOne: false
            referencedRelation: "media_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_budget_distributions: {
        Row: {
          amount: number
          created_at: string
          distribution_type: string
          end_date: string | null
          environment_id: string | null
          id: string
          media_plan_id: string
          parent_distribution_id: string | null
          percentage: number
          reference_id: string | null
          start_date: string | null
          temporal_date: string | null
          temporal_period: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          distribution_type: string
          end_date?: string | null
          environment_id?: string | null
          id?: string
          media_plan_id: string
          parent_distribution_id?: string | null
          percentage?: number
          reference_id?: string | null
          start_date?: string | null
          temporal_date?: string | null
          temporal_period?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          distribution_type?: string
          end_date?: string | null
          environment_id?: string | null
          id?: string
          media_plan_id?: string
          parent_distribution_id?: string | null
          percentage?: number
          reference_id?: string | null
          start_date?: string | null
          temporal_date?: string | null
          temporal_period?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_budget_distributions_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_budget_distributions_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_budget_distributions_parent_distribution_id_fkey"
            columns: ["parent_distribution_id"]
            isOneToOne: false
            referencedRelation: "plan_budget_distributions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_custom_kpis: {
        Row: {
          created_at: string | null
          custom_kpi_id: string | null
          id: string
          kpi_key: string
          media_plan_id: string
          target_value: number | null
        }
        Insert: {
          created_at?: string | null
          custom_kpi_id?: string | null
          id?: string
          kpi_key: string
          media_plan_id: string
          target_value?: number | null
        }
        Update: {
          created_at?: string | null
          custom_kpi_id?: string | null
          id?: string
          kpi_key?: string
          media_plan_id?: string
          target_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_custom_kpis_custom_kpi_id_fkey"
            columns: ["custom_kpi_id"]
            isOneToOne: false
            referencedRelation: "custom_kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_custom_kpis_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          media_plan_id: string
          permission_level: Database["public"]["Enums"]["plan_permission_level"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          media_plan_id: string
          permission_level?: Database["public"]["Enums"]["plan_permission_level"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          media_plan_id?: string
          permission_level?: Database["public"]["Enums"]["plan_permission_level"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_permissions_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string
          comment: string | null
          from_status: string | null
          id: string
          media_plan_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          comment?: string | null
          from_status?: string | null
          id?: string
          media_plan_id: string
          to_status: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          comment?: string | null
          from_status?: string | null
          id?: string
          media_plan_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_status_history_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_subdivisions: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          is_system: boolean
          name: string
          parent_id: string | null
          slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          name: string
          parent_id?: string | null
          slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          name?: string
          parent_id?: string | null
          slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_subdivisions_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_subdivisions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "plan_subdivisions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_system_user: boolean | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_system_user?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_system_user?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      report_column_mappings: {
        Row: {
          created_at: string
          id: string
          import_id: string
          source_column: string
          target_field: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          import_id: string
          source_column: string
          target_field: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          import_id?: string
          source_column?: string
          target_field?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_column_mappings_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "report_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_data: {
        Row: {
          avg_session_duration: number | null
          bounce_rate: number | null
          clicks: number | null
          conversions: number | null
          cost: number | null
          cpa: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          id: string
          import_id: string
          impressions: number | null
          leads: number | null
          line_code: string
          match_status: string | null
          media_line_id: string | null
          media_plan_id: string
          pageviews: number | null
          period_end: string | null
          period_start: string | null
          raw_data: Json | null
          roas: number | null
          sales: number | null
          sessions: number | null
        }
        Insert: {
          avg_session_duration?: number | null
          bounce_rate?: number | null
          clicks?: number | null
          conversions?: number | null
          cost?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          import_id: string
          impressions?: number | null
          leads?: number | null
          line_code: string
          match_status?: string | null
          media_line_id?: string | null
          media_plan_id: string
          pageviews?: number | null
          period_end?: string | null
          period_start?: string | null
          raw_data?: Json | null
          roas?: number | null
          sales?: number | null
          sessions?: number | null
        }
        Update: {
          avg_session_duration?: number | null
          bounce_rate?: number | null
          clicks?: number | null
          conversions?: number | null
          cost?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          import_id?: string
          impressions?: number | null
          leads?: number | null
          line_code?: string
          match_status?: string | null
          media_line_id?: string | null
          media_plan_id?: string
          pageviews?: number | null
          period_end?: string | null
          period_start?: string | null
          raw_data?: Json | null
          roas?: number | null
          sales?: number | null
          sessions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_data_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "report_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_data_media_line_id_fkey"
            columns: ["media_line_id"]
            isOneToOne: false
            referencedRelation: "media_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_data_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      report_imports: {
        Row: {
          created_at: string
          environment_id: string | null
          error_message: string | null
          id: string
          import_status: string | null
          last_import_at: string | null
          media_plan_id: string
          source_name: string
          source_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment_id?: string | null
          error_message?: string | null
          id?: string
          import_status?: string | null
          last_import_at?: string | null
          media_plan_id: string
          source_name: string
          source_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment_id?: string | null
          error_message?: string | null
          id?: string
          import_status?: string | null
          last_import_at?: string | null
          media_plan_id?: string
          source_name?: string
          source_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_imports_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_imports_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      report_metrics: {
        Row: {
          avg_session_duration: number | null
          bounce_rate: number | null
          campaign_name: string | null
          clicks: number | null
          conversions: number | null
          cost: number | null
          created_at: string | null
          data_source_id: string | null
          frequency: number | null
          id: string
          impressions: number | null
          leads: number | null
          line_code: string | null
          media_line_id: string | null
          pageviews: number | null
          raw_data: Json | null
          reach: number | null
          report_period_id: string
          revenue: number | null
          sales: number | null
          sessions: number | null
          updated_at: string | null
          user_id: string
          video_completions: number | null
          video_views: number | null
        }
        Insert: {
          avg_session_duration?: number | null
          bounce_rate?: number | null
          campaign_name?: string | null
          clicks?: number | null
          conversions?: number | null
          cost?: number | null
          created_at?: string | null
          data_source_id?: string | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          line_code?: string | null
          media_line_id?: string | null
          pageviews?: number | null
          raw_data?: Json | null
          reach?: number | null
          report_period_id: string
          revenue?: number | null
          sales?: number | null
          sessions?: number | null
          updated_at?: string | null
          user_id: string
          video_completions?: number | null
          video_views?: number | null
        }
        Update: {
          avg_session_duration?: number | null
          bounce_rate?: number | null
          campaign_name?: string | null
          clicks?: number | null
          conversions?: number | null
          cost?: number | null
          created_at?: string | null
          data_source_id?: string | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          line_code?: string | null
          media_line_id?: string | null
          pageviews?: number | null
          raw_data?: Json | null
          reach?: number | null
          report_period_id?: string
          revenue?: number | null
          sales?: number | null
          sessions?: number | null
          updated_at?: string | null
          user_id?: string
          video_completions?: number | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_metrics_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_metrics_media_line_id_fkey"
            columns: ["media_line_id"]
            isOneToOne: false
            referencedRelation: "media_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_metrics_report_period_id_fkey"
            columns: ["report_period_id"]
            isOneToOne: false
            referencedRelation: "report_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      report_periods: {
        Row: {
          created_at: string | null
          environment_id: string | null
          id: string
          media_plan_id: string
          period_date: string
          period_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          environment_id?: string | null
          id?: string
          media_plan_id: string
          period_date: string
          period_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          environment_id?: string | null
          id?: string
          media_plan_id?: string
          period_date?: string
          period_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_periods_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_periods_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      specification_copy_fields: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean | null
          max_characters: number | null
          name: string
          observation: string | null
          specification_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          max_characters?: number | null
          name: string
          observation?: string | null
          specification_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          max_characters?: number | null
          name?: string
          observation?: string | null
          specification_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specification_copy_fields_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "creative_type_specifications"
            referencedColumns: ["id"]
          },
        ]
      }
      specification_dimensions: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          height: number
          id: string
          is_active: boolean | null
          observation: string | null
          specification_id: string
          unit: string
          updated_at: string
          user_id: string
          width: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          height: number
          id?: string
          is_active?: boolean | null
          observation?: string | null
          specification_id: string
          unit?: string
          updated_at?: string
          user_id: string
          width: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          height?: number
          id?: string
          is_active?: boolean | null
          observation?: string | null
          specification_id?: string
          unit?: string
          updated_at?: string
          user_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "specification_dimensions_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "creative_type_specifications"
            referencedColumns: ["id"]
          },
        ]
      }
      specification_extensions: {
        Row: {
          created_at: string
          extension_id: string
          id: string
          specification_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extension_id: string
          id?: string
          specification_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          extension_id?: string
          id?: string
          specification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specification_extensions_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "file_extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_extensions_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "creative_type_specifications"
            referencedColumns: ["id"]
          },
        ]
      }
      status_transitions: {
        Row: {
          created_at: string | null
          environment_id: string | null
          from_status_id: string | null
          id: string
          is_system: boolean | null
          requires_comment: boolean | null
          to_status_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          environment_id?: string | null
          from_status_id?: string | null
          id?: string
          is_system?: boolean | null
          requires_comment?: boolean | null
          to_status_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          environment_id?: string | null
          from_status_id?: string | null
          id?: string
          is_system?: boolean | null
          requires_comment?: boolean | null
          to_status_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_transitions_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_transitions_from_status_id_fkey"
            columns: ["from_status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_transitions_to_status_id_fkey"
            columns: ["to_status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      statuses: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          is_system: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statuses_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      system_access_requests: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["system_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["system_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["system_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      targets: {
        Row: {
          age_range: string | null
          behavior: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          geolocation: Json | null
          id: string
          is_active: boolean | null
          name: string
          slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_range?: string | null
          behavior?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          geolocation?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_range?: string | null
          behavior?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          geolocation?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "targets_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          environment_id: string | null
          id: string
          is_active: boolean | null
          medium_id: string | null
          name: string
          slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          medium_id?: string | null
          name: string
          slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          environment_id?: string | null
          id?: string
          is_active?: boolean | null
          medium_id?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_medium_id_fkey"
            columns: ["medium_id"]
            isOneToOne: false
            referencedRelation: "mediums"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      build_utm_campaign_string: {
        Args: {
          p_campaign_name: string
          p_funnel_slug: string
          p_line_code: string
          p_moment_slug: string
          p_subdivision_slug: string
        }
        Returns: string
      }
      can_access_user_data: {
        Args: { _owner_user_id: string }
        Returns: boolean
      }
      can_access_user_data_for_write: {
        Args: { _owner_user_id: string }
        Returns: boolean
      }
      can_edit_plan: { Args: { _plan_id: string }; Returns: boolean }
      can_invite_environment_member: {
        Args: { _environment_owner_id: string }
        Returns: boolean
      }
      can_invite_to_environment: {
        Args: { _environment_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_member_role: {
        Args: {
          _environment_id: string
          _manager_user_id: string
          _target_user_id: string
        }
        Returns: boolean
      }
      can_remove_environment_member: {
        Args: {
          _environment_id: string
          _remover_user_id: string
          _target_user_id: string
        }
        Returns: boolean
      }
      can_transition_status: {
        Args: {
          _from_status: string
          _plan_id: string
          _to_status: string
          _user_id: string
        }
        Returns: boolean
      }
      can_view_environment_roles: {
        Args: { _environment_id: string }
        Returns: boolean
      }
      can_view_plan: { Args: { _plan_id: string }; Returns: boolean }
      cleanup_old_auto_backups: { Args: never; Returns: number }
      count_environment_members: {
        Args: { _environment_owner_id: string }
        Returns: number
      }
      create_auto_backup_snapshot: {
        Args: {
          _change_description?: string
          _plan_id: string
          _user_id: string
        }
        Returns: string
      }
      create_plan_version_snapshot: {
        Args: { _change_log?: string; _plan_id: string; _user_id: string }
        Returns: string
      }
      expire_pending_invites: { Args: never; Returns: number }
      generate_creative_id: { Args: never; Returns: string }
      generate_slug: { Args: { input_text: string }; Returns: string }
      generate_unique_plan_slug: {
        Args: { p_current_id?: string; p_name: string; p_user_id: string }
        Returns: string
      }
      get_effective_plan_permission: {
        Args: { _plan_id: string; _user_id?: string }
        Returns: string
      }
      get_environment_id_for_user: {
        Args: { _user_id: string }
        Returns: string
      }
      get_environment_members_admin: {
        Args: { p_environment_id: string }
        Returns: {
          accepted_at: string
          email: string
          full_name: string
          invited_at: string
          is_environment_admin: boolean
          user_id: string
        }[]
      }
      get_environment_members_with_details: {
        Args: { p_environment_id: string }
        Returns: {
          accepted_at: string
          email: string
          full_name: string
          invited_at: string
          is_environment_admin: boolean
          perm_executive_dashboard: string
          perm_finance: string
          perm_library: string
          perm_media_plans: string
          perm_media_resources: string
          perm_reports: string
          perm_taxonomy: string
          role_delete: boolean
          role_edit: boolean
          role_invite: boolean
          role_read: boolean
          user_id: string
        }[]
      }
      get_environment_permission: {
        Args: {
          _environment_owner_id: string
          _section: string
          _user_id: string
        }
        Returns: Database["public"]["Enums"]["environment_permission_level"]
      }
      get_environment_role: {
        Args: { _environment_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["environment_role"]
      }
      get_plan_role: {
        Args: { _plan_id: string; _user_id: string }
        Returns: string
      }
      get_user_environments: {
        Args: { _user_id: string }
        Returns: {
          environment_name: string
          environment_owner_id: string
          environment_role: Database["public"]["Enums"]["environment_role"]
          is_own_environment: boolean
        }[]
      }
      get_user_environments_v2: {
        Args: { _user_id: string }
        Returns: {
          environment_id: string
          environment_name: string
          environment_owner_id: string
          is_environment_admin: boolean
          is_own_environment: boolean
          role_delete: boolean
          role_edit: boolean
          role_invite: boolean
          role_read: boolean
        }[]
      }
      has_environment_access: {
        Args: { _environment_id: string; _permission?: string }
        Returns: boolean
      }
      has_environment_permission: {
        Args: {
          _environment_owner_id: string
          _min_level: Database["public"]["Enums"]["environment_permission_level"]
          _section: string
          _user_id: string
        }
        Returns: boolean
      }
      has_environment_section_access: {
        Args: {
          _environment_id: string
          _required_level?: string
          _section: string
        }
        Returns: boolean
      }
      has_finance_role: {
        Args: { check_user_id: string; required_roles?: string[] }
        Returns: boolean
      }
      is_environment_admin: {
        Args: { _environment_owner_id: string; _user_id: string }
        Returns: boolean
      }
      is_environment_member: {
        Args: { _environment_owner_id: string; _user_id: string }
        Returns: boolean
      }
      is_environment_owner: { Args: { _user_id: string }; Returns: boolean }
      is_environment_owner_of: {
        Args: { _environment_id: string; _user_id: string }
        Returns: boolean
      }
      is_system_admin: { Args: { _user_id: string }; Returns: boolean }
      list_all_environments: {
        Args: never
        Returns: {
          admin_count: number
          cnpj: string
          company_name: string
          created_at: string
          created_by: string
          id: string
          member_count: number
          name: string
        }[]
      }
    }
    Enums: {
      environment_permission_level: "none" | "view" | "edit" | "admin"
      environment_role: "owner" | "admin" | "user"
      environment_section:
        | "executive_dashboard"
        | "reports"
        | "finance"
        | "media_plans"
        | "media_resources"
        | "taxonomy"
        | "library"
      plan_permission_level: "none" | "view" | "edit"
      system_role: "system_admin" | "user"
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
      environment_permission_level: ["none", "view", "edit", "admin"],
      environment_role: ["owner", "admin", "user"],
      environment_section: [
        "executive_dashboard",
        "reports",
        "finance",
        "media_plans",
        "media_resources",
        "taxonomy",
        "library",
      ],
      plan_permission_level: ["none", "view", "edit"],
      system_role: ["system_admin", "user"],
    },
  },
} as const
