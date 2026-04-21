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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      boat_classes: {
        Row: {
          archived: boolean
          base_py: number
          created_at: string
          default_laps: number
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          base_py: number
          created_at?: string
          default_laps?: number
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          base_py?: number
          created_at?: string
          default_laps?: number
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      boats: {
        Row: {
          archived: boolean
          class_id: string
          colour: string | null
          created_at: string
          id: string
          name: string | null
          notes: string | null
          sail_number: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          class_id: string
          colour?: string | null
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          sail_number: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          class_id?: string
          colour?: string | null
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          sail_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boats_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "boat_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      lap_times: {
        Row: {
          created_at: string
          cumulative_elapsed_ms: number
          id: string
          lap_number: number
          race_entry_id: string
        }
        Insert: {
          created_at?: string
          cumulative_elapsed_ms: number
          id?: string
          lap_number: number
          race_entry_id: string
        }
        Update: {
          created_at?: string
          cumulative_elapsed_ms?: number
          id?: string
          lap_number?: number
          race_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lap_times_race_entry_id_fkey"
            columns: ["race_entry_id"]
            isOneToOne: false
            referencedRelation: "race_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_handicap_history: {
        Row: {
          created_at: string
          id: string
          py_delta_after: number
          py_delta_before: number
          race_id: string
          racer_id: string
          reason: string | null
          season_id: string
          trophy_award_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          py_delta_after: number
          py_delta_before: number
          race_id: string
          racer_id: string
          reason?: string | null
          season_id: string
          trophy_award_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          py_delta_after?: number
          py_delta_before?: number
          race_id?: string
          racer_id?: string
          reason?: string | null
          season_id?: string
          trophy_award_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_handicap_history_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_handicap_history_racer_id_fkey"
            columns: ["racer_id"]
            isOneToOne: false
            referencedRelation: "racers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_handicap_history_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_handicap_history_trophy_award_id_fkey"
            columns: ["trophy_award_id"]
            isOneToOne: false
            referencedRelation: "trophy_awards"
            referencedColumns: ["id"]
          },
        ]
      }
      race_entries: {
        Row: {
          base_py_snapshot: number | null
          boat_id: string
          class_id_snapshot: string | null
          corrected_ms: number | null
          created_at: string
          effective_py_snapshot: number | null
          elapsed_ms: number | null
          finish_time_ms: number | null
          id: string
          laps_to_sail: number | null
          normalised_elapsed_ms: number | null
          personal_py_delta_snapshot: number | null
          position_class: number | null
          position_overall: number | null
          race_id: string
          racer_id: string
          status: Database["public"]["Enums"]["entry_status"]
          updated_at: string
        }
        Insert: {
          base_py_snapshot?: number | null
          boat_id: string
          class_id_snapshot?: string | null
          corrected_ms?: number | null
          created_at?: string
          effective_py_snapshot?: number | null
          elapsed_ms?: number | null
          finish_time_ms?: number | null
          id?: string
          laps_to_sail?: number | null
          normalised_elapsed_ms?: number | null
          personal_py_delta_snapshot?: number | null
          position_class?: number | null
          position_overall?: number | null
          race_id: string
          racer_id: string
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
        }
        Update: {
          base_py_snapshot?: number | null
          boat_id?: string
          class_id_snapshot?: string | null
          corrected_ms?: number | null
          created_at?: string
          effective_py_snapshot?: number | null
          elapsed_ms?: number | null
          finish_time_ms?: number | null
          id?: string
          laps_to_sail?: number | null
          normalised_elapsed_ms?: number | null
          personal_py_delta_snapshot?: number | null
          position_class?: number | null
          position_overall?: number | null
          race_id?: string
          racer_id?: string
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "race_entries_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_entries_class_id_snapshot_fkey"
            columns: ["class_id_snapshot"]
            isOneToOne: false
            referencedRelation: "boat_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_entries_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_entries_racer_id_fkey"
            columns: ["racer_id"]
            isOneToOne: false
            referencedRelation: "racers"
            referencedColumns: ["id"]
          },
        ]
      }
      race_trophies: {
        Row: {
          created_at: string
          display_order: number
          race_id: string
          trophy_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          race_id: string
          trophy_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          race_id?: string
          trophy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "race_trophies_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_trophies_trophy_id_fkey"
            columns: ["trophy_id"]
            isOneToOne: false
            referencedRelation: "trophies"
            referencedColumns: ["id"]
          },
        ]
      }
      racers: {
        Row: {
          archived: boolean
          created_at: string
          default_boat_id: string | null
          display_name: string
          full_name: string
          id: string
          notes: string | null
          personal_py_delta: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          default_boat_id?: string | null
          display_name: string
          full_name: string
          id?: string
          notes?: string | null
          personal_py_delta?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          default_boat_id?: string | null
          display_name?: string
          full_name?: string
          id?: string
          notes?: string | null
          personal_py_delta?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "racers_default_boat_id_fkey"
            columns: ["default_boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
        ]
      }
      races: {
        Row: {
          course_description: string | null
          created_at: string
          day_offset: number
          id: string
          is_pursuit: boolean
          name: string
          notes: string | null
          reference_laps: number | null
          season_id: string
          start_time: string
          started_at: string | null
          status: Database["public"]["Enums"]["race_status"]
          updated_at: string
          use_base_py_only: boolean
        }
        Insert: {
          course_description?: string | null
          created_at?: string
          day_offset: number
          id?: string
          is_pursuit?: boolean
          name: string
          notes?: string | null
          reference_laps?: number | null
          season_id: string
          start_time?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["race_status"]
          updated_at?: string
          use_base_py_only?: boolean
        }
        Update: {
          course_description?: string | null
          created_at?: string
          day_offset?: number
          id?: string
          is_pursuit?: boolean
          name?: string
          notes?: string | null
          reference_laps?: number | null
          season_id?: string
          start_time?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["race_status"]
          updated_at?: string
          use_base_py_only?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "races_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: Database["public"]["Enums"]["season_status"]
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["season_status"]
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["season_status"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      trophies: {
        Row: {
          accumulator_group: string | null
          created_at: string
          description: string | null
          eligibility_notes: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          accumulator_group?: string | null
          created_at?: string
          description?: string | null
          eligibility_notes?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          accumulator_group?: string | null
          created_at?: string
          description?: string | null
          eligibility_notes?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      trophy_awards: {
        Row: {
          awarded_at: string
          created_at: string
          id: string
          notes: string | null
          race_id: string
          racer_id: string
          trophy_id: string
          updated_at: string
        }
        Insert: {
          awarded_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          race_id: string
          racer_id: string
          trophy_id: string
          updated_at?: string
        }
        Update: {
          awarded_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          race_id?: string
          racer_id?: string
          trophy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trophy_awards_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophy_awards_racer_id_fkey"
            columns: ["racer_id"]
            isOneToOne: false
            referencedRelation: "racers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophy_awards_trophy_id_fkey"
            columns: ["trophy_id"]
            isOneToOne: false
            referencedRelation: "trophies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_trophy_award: {
        Args: { p_race_id: string; p_racer_id: string; p_trophy_id: string }
        Returns: string
      }
      create_season_from_template: { Args: { p_year: number }; Returns: string }
      undo_trophy_award: { Args: { p_award_id: string }; Returns: undefined }
    }
    Enums: {
      entry_status:
        | "racing"
        | "FIN"
        | "DNF"
        | "DNS"
        | "DSQ"
        | "RET"
        | "OCS"
        | "DNC"
      race_status: "draft" | "running" | "finished"
      season_status: "draft" | "locked"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      entry_status: ["racing", "FIN", "DNF", "DNS", "DSQ", "RET", "OCS", "DNC"],
      race_status: ["draft", "running", "finished"],
      season_status: ["draft", "locked"],
    },
  },
} as const
