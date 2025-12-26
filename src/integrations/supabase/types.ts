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
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      channels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_templates: {
        Row: {
          created_at: string
          creative_type_id: string | null
          dimension: string | null
          dimensions: Json | null
          duration: string | null
          format: string
          id: string
          message: string | null
          name: string
          objective: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creative_type_id?: string | null
          dimension?: string | null
          dimensions?: Json | null
          duration?: string | null
          format: string
          id?: string
          message?: string | null
          name: string
          objective?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creative_type_id?: string | null
          dimension?: string | null
          dimensions?: Json | null
          duration?: string | null
          format?: string
          id?: string
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
        ]
      }
      creative_type_specifications: {
        Row: {
          created_at: string
          creative_type_id: string
          duration_unit: string | null
          duration_value: number | null
          has_duration: boolean | null
          id: string
          max_weight: number | null
          name: string
          updated_at: string
          user_id: string
          weight_unit: string | null
        }
        Insert: {
          created_at?: string
          creative_type_id: string
          duration_unit?: string | null
          duration_value?: number | null
          has_duration?: boolean | null
          id?: string
          max_weight?: number | null
          name: string
          updated_at?: string
          user_id: string
          weight_unit?: string | null
        }
        Update: {
          created_at?: string
          creative_type_id?: string
          duration_unit?: string | null
          duration_value?: number | null
          has_duration?: boolean | null
          id?: string
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
      format_creative_types: {
        Row: {
          created_at: string
          format_id: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          format_id: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          format_id?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          id: string
          is_system: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      funnel_stages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          order_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          order_index?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          order_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      media_creatives: {
        Row: {
          asset_url: string | null
          copy_text: string | null
          created_at: string | null
          creative_id: string | null
          creative_type: string | null
          format_id: string | null
          id: string
          media_line_id: string
          name: string
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asset_url?: string | null
          copy_text?: string | null
          created_at?: string | null
          creative_id?: string | null
          creative_type?: string | null
          format_id?: string | null
          id?: string
          media_line_id: string
          name: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asset_url?: string | null
          copy_text?: string | null
          created_at?: string | null
          creative_id?: string | null
          creative_type?: string | null
          format_id?: string | null
          id?: string
          media_line_id?: string
          name?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
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
          id: string
          media_line_id: string
          month_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          media_line_id: string
          month_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          media_line_id?: string
          month_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          destination_url: string | null
          end_date: string | null
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
          destination_url?: string | null
          end_date?: string | null
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
          destination_url?: string | null
          end_date?: string | null
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
      media_plans: {
        Row: {
          campaign: string | null
          client: string | null
          created_at: string | null
          deleted_at: string | null
          end_date: string | null
          id: string
          kpis: Json | null
          name: string
          objectives: string[] | null
          start_date: string | null
          status: string | null
          total_budget: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign?: string | null
          client?: string | null
          created_at?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          kpis?: Json | null
          name: string
          objectives?: string[] | null
          start_date?: string | null
          status?: string | null
          total_budget?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign?: string | null
          client?: string | null
          created_at?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          kpis?: Json | null
          name?: string
          objectives?: string[] | null
          start_date?: string | null
          status?: string | null
          total_budget?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mediums: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      moments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_budget_distributions: {
        Row: {
          amount: number
          created_at: string
          distribution_type: string
          id: string
          media_plan_id: string
          parent_distribution_id: string | null
          percentage: number
          reference_id: string | null
          temporal_date: string | null
          temporal_period: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          distribution_type: string
          id?: string
          media_plan_id: string
          parent_distribution_id?: string | null
          percentage?: number
          reference_id?: string | null
          temporal_date?: string | null
          temporal_period?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          distribution_type?: string
          id?: string
          media_plan_id?: string
          parent_distribution_id?: string | null
          percentage?: number
          reference_id?: string | null
          temporal_date?: string | null
          temporal_period?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
      plan_subdivisions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      specification_copy_fields: {
        Row: {
          created_at: string
          id: string
          max_characters: number | null
          name: string
          observation: string | null
          specification_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_characters?: number | null
          name: string
          observation?: string | null
          specification_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
          description: string | null
          height: number
          id: string
          observation: string | null
          specification_id: string
          unit: string
          updated_at: string
          user_id: string
          width: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          height: number
          id?: string
          observation?: string | null
          specification_id: string
          unit?: string
          updated_at?: string
          user_id: string
          width: number
        }
        Update: {
          created_at?: string
          description?: string | null
          height?: number
          id?: string
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
      statuses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
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
          description: string | null
          geolocation: Json | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age_range?: string | null
          behavior?: string | null
          created_at?: string
          description?: string | null
          geolocation?: Json | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age_range?: string | null
          behavior?: string | null
          created_at?: string
          description?: string | null
          geolocation?: Json | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          medium_id: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          medium_id?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          medium_id?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
      generate_creative_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
