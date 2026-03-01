CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "public"."challenge_project_status" AS ENUM('idea', 'design', 'pilot', 'active', 'completed', 'on_hold', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."challenge_status" AS ENUM('draft', 'open', 'in_progress', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."colab_application_status" AS ENUM('submitted', 'under_review', 'accepted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."colab_call_status" AS ENUM('draft', 'open', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."colab_cohort_status" AS ENUM('planned', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."colab_confidentiality" AS ENUM('public', 'internal', 'confidential', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."colab_milestone_status" AS ENUM('planned', 'in_progress', 'completed', 'delayed');--> statement-breakpoint
CREATE TYPE "public"."colab_program_status" AS ENUM('draft', 'active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."colab_session_status" AS ENUM('scheduled', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."colab_session_type" AS ENUM('kickoff', 'workshop', 'clinic', 'demo_day');--> statement-breakpoint
CREATE TYPE "public"."colab_type" AS ENUM('big_idea', 'multi_idea', 'incubation_early_stage');--> statement-breakpoint
CREATE TYPE "public"."contribution_type" AS ENUM('research', 'design', 'feedback', 'artifact', 'mentoring', 'technical', 'other');--> statement-breakpoint
CREATE TYPE "public"."contribution_validation" AS ENUM('pending', 'approved', 'rejected', 'needs_revision');--> statement-breakpoint
CREATE TYPE "public"."course_level" AS ENUM('introductorio', 'intermedio', 'avanzado');--> statement-breakpoint
CREATE TYPE "public"."course_modality" AS ENUM('online', 'presencial', 'hibrido', 'asincrono', 'sincrono');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('draft', 'open', 'ongoing', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."decision_type" AS ENUM('scope', 'pivot', 'priority', 'alliance', 'resource', 'timeline', 'other');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('enrolled', 'in_progress', 'completed', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."event_registration_status" AS ENUM('registered', 'attended', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('general', 'acceleration', 'workshop', 'mentorship_session', 'demo_day', 'pitch_practice', 'networking');--> statement-breakpoint
CREATE TYPE "public"."idea_maturity" AS ENUM('concept', 'validated_problem', 'solution_design', 'prototype', 'pilot', 'scaling');--> statement-breakpoint
CREATE TYPE "public"."idea_track_status" AS ENUM('enrolled', 'in_progress', 'completed', 'withdrawn', 'graduated');--> statement-breakpoint
CREATE TYPE "public"."legal_status" AS ENUM('nonprofit', 'governmental', 'educational', 'corporate', 'community_based', 'other');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('suggested', 'pending_approval', 'accepted', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."match_type" AS ENUM('challenge_project', 'project_talent', 'organization_talent', 'organization_project');--> statement-breakpoint
CREATE TYPE "public"."mentorship_enrollment_status" AS ENUM('requested', 'confirmed', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."mentorship_program_status" AS ENUM('draft', 'open', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."mentorship_progress_level" AS ENUM('idea_inicial', 'diagnostico', 'diseno_proyecto', 'prototipo', 'pitch_listo', 'implementacion');--> statement-breakpoint
CREATE TYPE "public"."mentorship_session_status" AS ENUM('scheduled', 'done', 'cancelled', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."method_decision_type" AS ENUM('method_adjustment', 'exception', 'pivot', 'acceleration', 'pause', 'other');--> statement-breakpoint
CREATE TYPE "public"."module_content_type" AS ENUM('video', 'reading', 'workbook', 'assignment', 'liveSession');--> statement-breakpoint
CREATE TYPE "public"."org_membership_role" AS ENUM('volunteer_consultant', 'mentor', 'project_lead', 'staff', 'partner_representative', 'board_member', 'advisor', 'other');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('complete', 'incomplete', 'pending');--> statement-breakpoint
CREATE TYPE "public"."project_participant_role" AS ENUM('project_lead', 'volunteer_consultant', 'mentor', 'evaluator', 'team_member', 'advisor', 'other');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'active', 'completed', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."review_moment" AS ENUM('initial', 'intermediate', 'final', 'other');--> statement-breakpoint
CREATE TYPE "public"."role_type" AS ENUM('usuario', 'mentor', 'facilitador', 'proponente', 'acreditador');--> statement-breakpoint
CREATE TYPE "public"."stage_progress_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."team_role_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TABLE "acceleration_programs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"max_participants" integer,
	"status" varchar DEFAULT 'draft',
	"created_by_user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "challenge_projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" varchar,
	"title" varchar NOT NULL,
	"summary" text,
	"status" "challenge_project_status" DEFAULT 'idea',
	"lead_organization_id" varchar,
	"location_city" varchar,
	"location_country" varchar,
	"sdg_tags" text[],
	"impact_focus" varchar,
	"start_date" date,
	"end_date" date,
	"is_pilot" boolean DEFAULT true,
	"created_by_user_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"context_organization_id" varchar,
	"city" varchar,
	"country" varchar,
	"sdg_tags" text[],
	"status" "challenge_status" DEFAULT 'draft',
	"created_by_user_id" varchar,
	"open_from" date,
	"open_until" date,
	"max_projects" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" varchar NOT NULL,
	"project_id" varchar,
	"applicant_user_id" varchar NOT NULL,
	"idea_title" varchar NOT NULL,
	"idea_summary" text,
	"status" "colab_application_status" DEFAULT 'submitted',
	"submitted_at" timestamp DEFAULT now(),
	"decided_at" timestamp,
	"decided_by_user_id" varchar,
	"score_average" integer
);
--> statement-breakpoint
CREATE TABLE "colab_calls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"type" "colab_type" NOT NULL,
	"host_organization_id" varchar,
	"open_from" timestamp,
	"open_until" timestamp,
	"max_applications" integer,
	"status" "colab_call_status" DEFAULT 'draft',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_cohorts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" "colab_cohort_status" DEFAULT 'planned',
	"lead_facilitator_user_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_evaluations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"judge_user_id" varchar NOT NULL,
	"score" integer,
	"comments" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_focus_ideas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"summary" text,
	"problem_opportunity" text,
	"target_beneficiaries" text,
	"proposed_solution" text,
	"impact_tags" text,
	"challenge_id" varchar,
	"project_id" varchar,
	"maturity_level" "idea_maturity" DEFAULT 'concept',
	"key_assumptions" text,
	"identified_risks" text,
	"strategic_questions" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_idea_contributions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"contributor_user_id" varchar NOT NULL,
	"role_id" varchar,
	"contribution_type" "contribution_type",
	"brief_description" varchar,
	"detailed_contribution" text,
	"artifact_url" varchar,
	"session_id" varchar,
	"milestone_id" varchar,
	"time_spent_minutes" integer,
	"validation_status" "contribution_validation" DEFAULT 'pending',
	"reviewer_user_id" varchar,
	"reviewer_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_idea_decision_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"focus_idea_id" varchar,
	"decision_type" "decision_type",
	"description" text,
	"justification" text,
	"decided_by_user_id" varchar,
	"decided_at" timestamp DEFAULT now(),
	"artifact_url" varchar,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "colab_idea_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"focus_idea_id" varchar,
	"review_moment" "review_moment",
	"rubric_reference" varchar,
	"overall_evaluation" text,
	"strengths" text,
	"areas_to_improve" text,
	"recommendations" text,
	"reviewer_user_id" varchar,
	"reviewed_at" timestamp DEFAULT now(),
	"artifacts_considered" text
);
--> statement-breakpoint
CREATE TABLE "colab_idea_team_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"role_name" varchar NOT NULL,
	"description" text,
	"responsibilities" text,
	"dedication_level" varchar,
	"selection_criteria" text,
	"status" "team_role_status" DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_idea_tracks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"cohort_id" varchar,
	"idea_title" varchar NOT NULL,
	"idea_summary" text,
	"owner_user_id" varchar,
	"organization_id" varchar,
	"status" "idea_track_status" DEFAULT 'enrolled',
	"started_at" timestamp,
	"closed_at" timestamp,
	"project_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_method_decision_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"affected_stage" varchar,
	"decision_type" "method_decision_type",
	"description" text,
	"justification" text,
	"decided_by_user_id" varchar,
	"decided_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "colab_method_frameworks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"framework_name" varchar NOT NULL,
	"description" text,
	"stages_list" text,
	"stages_description" text,
	"tools_per_stage" text,
	"artifacts_per_stage" text,
	"evaluation_criteria_per_stage" text,
	"version" varchar DEFAULT '1.0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_method_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"cohort_id" varchar,
	"framework_id" varchar,
	"overall_evaluation" text,
	"patterns_observed" text,
	"method_strengths" text,
	"method_limitations" text,
	"improvement_recommendations" text,
	"reviewer_user_id" varchar,
	"reviewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_milestones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" varchar NOT NULL,
	"project_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"due_date" timestamp,
	"status" "colab_milestone_status" DEFAULT 'planned',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_program_one_big_idea" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" varchar NOT NULL,
	"focus_idea_id" varchar,
	"collaboration_rules" text,
	"confidentiality_level" "colab_confidentiality" DEFAULT 'internal',
	"expected_results" text,
	"success_criteria" text,
	"contribution_policy" text,
	"status" "colab_program_status" DEFAULT 'draft',
	"start_date" timestamp,
	"end_date" timestamp,
	"created_by_user_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_program_one_big_method" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" varchar NOT NULL,
	"method_name" varchar NOT NULL,
	"method_description" text,
	"method_objective" text,
	"eligible_idea_types" text,
	"max_parallel_ideas" integer,
	"max_participants_per_cohort" integer,
	"expected_results" text,
	"success_criteria" text,
	"evaluation_model" text,
	"usage_policy" text,
	"status" "colab_program_status" DEFAULT 'draft',
	"start_date" timestamp,
	"end_date" timestamp,
	"created_by_user_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"session_type" "colab_session_type" NOT NULL,
	"scheduled_at" timestamp,
	"duration_minutes" integer DEFAULT 60,
	"facilitator_user_id" varchar,
	"status" "colab_session_status" DEFAULT 'scheduled',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "colab_track_stage_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_track_id" varchar NOT NULL,
	"stage_name" varchar NOT NULL,
	"status" "stage_progress_status" DEFAULT 'not_started',
	"evaluation_result" text,
	"facilitator_notes" text,
	"blockers" text,
	"evidence_artifacts" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_certificates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"issue_date" timestamp DEFAULT now(),
	"certificate_number" varchar NOT NULL,
	"issuer_organization_id" varchar,
	"digital_url" varchar,
	CONSTRAINT "course_certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "course_enrollments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"status" "enrollment_status" DEFAULT 'enrolled',
	"completed_modules_count" integer DEFAULT 0,
	"total_modules_count" integer DEFAULT 0,
	"progress_percent" integer DEFAULT 0,
	"last_accessed_at" timestamp,
	"enrolled_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"certificate_id" varchar
);
--> statement-breakpoint
CREATE TABLE "course_evaluations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"max_score" integer DEFAULT 100 NOT NULL,
	"passed" boolean DEFAULT false,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_modules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"order" integer DEFAULT 1 NOT NULL,
	"content_type" "module_content_type" DEFAULT 'video',
	"resource_url" varchar,
	"is_mandatory" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"modality" "course_modality" DEFAULT 'online',
	"language" varchar DEFAULT 'es',
	"level" "course_level" DEFAULT 'introductorio',
	"duration_hours" integer,
	"certifying_organization_id" varchar,
	"status" "course_status" DEFAULT 'draft',
	"image_url" varchar,
	"created_by_user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"status" "event_registration_status" DEFAULT 'registered',
	"registered_at" timestamp DEFAULT now(),
	"attended_at" timestamp,
	"cancelled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"event_date" timestamp NOT NULL,
	"end_date" timestamp,
	"location" varchar,
	"is_online" varchar DEFAULT 'false',
	"meeting_url" varchar,
	"max_attendees" integer,
	"category" varchar,
	"event_type" "event_type" DEFAULT 'general',
	"acceleration_program_id" varchar,
	"phase" varchar,
	"is_mandatory" varchar DEFAULT 'false',
	"status" "event_status" DEFAULT 'draft',
	"created_by_user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "match_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" varchar,
	"project_id" varchar,
	"organization_id" varchar,
	"professional_user_id" varchar,
	"match_type" "match_type" NOT NULL,
	"status" "match_status" DEFAULT 'suggested',
	"score" integer,
	"score_details" jsonb,
	"created_at" timestamp DEFAULT now(),
	"decided_at" timestamp,
	"decided_by_user_id" varchar,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "mentorship_enrollments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"mentee_user_id" varchar NOT NULL,
	"mentor_user_id" varchar,
	"status" "mentorship_enrollment_status" DEFAULT 'requested',
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentorship_programs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"sessions_planned" integer DEFAULT 4,
	"focus_area" varchar,
	"status" "mentorship_program_status" DEFAULT 'draft',
	"created_by_user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentorship_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"summary" text,
	"progress_level" "mentorship_progress_level",
	"action_items" text,
	"created_by_user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentorship_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" varchar NOT NULL,
	"session_number" integer DEFAULT 1 NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 60,
	"status" "mentorship_session_status" DEFAULT 'scheduled',
	"meeting_link" varchar,
	"attendance_recorded" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentorships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar,
	"mentee_id" varchar NOT NULL,
	"mentor_id" varchar,
	"project_id" varchar,
	"status" varchar DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"role" "org_membership_role",
	"start_date" timestamp,
	"end_date" timestamp,
	"is_current" varchar DEFAULT 'true',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"legal_status" "legal_status",
	"description" text,
	"country" varchar,
	"city" varchar,
	"website" varchar,
	"logo_url" varchar,
	"is_active" varchar DEFAULT 'true',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" "project_participant_role" DEFAULT 'team_member',
	"assigned_hours" integer,
	"is_lead" boolean DEFAULT false,
	"start_date" date,
	"end_date" date,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"objectives" text,
	"target_beneficiaries" varchar,
	"expected_impact" text,
	"location" varchar,
	"category" varchar,
	"status" "project_status" DEFAULT 'draft',
	"owner_id" varchar NOT NULL,
	"mentor_id" varchar,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" "role_type" NOT NULL,
	"description" text,
	"authorization_level" varchar DEFAULT 'basic',
	"status" varchar DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar,
	"bio" text,
	"country" varchar,
	"city" varchar,
	"languages" text[],
	"skills" text[],
	"experience_areas" text[],
	"interests" text[],
	"linkedin_url" varchar,
	"profile_status" "profile_status" DEFAULT 'incomplete',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"role_id" varchar NOT NULL,
	"context" varchar DEFAULT 'global',
	"is_primary" varchar DEFAULT 'true',
	"status" varchar DEFAULT 'active',
	"assigned_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"preferred_language" varchar DEFAULT 'es',
	"timezone" varchar DEFAULT 'America/Mexico_City',
	"status" "user_status" DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_access_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "acceleration_programs" ADD CONSTRAINT "acceleration_programs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_projects" ADD CONSTRAINT "challenge_projects_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_projects" ADD CONSTRAINT "challenge_projects_lead_organization_id_organizations_id_fk" FOREIGN KEY ("lead_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_projects" ADD CONSTRAINT "challenge_projects_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_context_organization_id_organizations_id_fk" FOREIGN KEY ("context_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_applications" ADD CONSTRAINT "colab_applications_call_id_colab_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."colab_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_applications" ADD CONSTRAINT "colab_applications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_applications" ADD CONSTRAINT "colab_applications_applicant_user_id_users_id_fk" FOREIGN KEY ("applicant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_applications" ADD CONSTRAINT "colab_applications_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_calls" ADD CONSTRAINT "colab_calls_host_organization_id_organizations_id_fk" FOREIGN KEY ("host_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_cohorts" ADD CONSTRAINT "colab_cohorts_call_id_colab_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."colab_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_cohorts" ADD CONSTRAINT "colab_cohorts_lead_facilitator_user_id_users_id_fk" FOREIGN KEY ("lead_facilitator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_evaluations" ADD CONSTRAINT "colab_evaluations_application_id_colab_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."colab_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_evaluations" ADD CONSTRAINT "colab_evaluations_judge_user_id_users_id_fk" FOREIGN KEY ("judge_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_focus_ideas" ADD CONSTRAINT "colab_focus_ideas_program_id_colab_program_one_big_idea_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."colab_program_one_big_idea"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_focus_ideas" ADD CONSTRAINT "colab_focus_ideas_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_contributions" ADD CONSTRAINT "colab_idea_contributions_program_id_colab_program_one_big_idea_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."colab_program_one_big_idea"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_contributions" ADD CONSTRAINT "colab_idea_contributions_contributor_user_id_users_id_fk" FOREIGN KEY ("contributor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_contributions" ADD CONSTRAINT "colab_idea_contributions_role_id_colab_idea_team_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."colab_idea_team_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_contributions" ADD CONSTRAINT "colab_idea_contributions_session_id_colab_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."colab_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_contributions" ADD CONSTRAINT "colab_idea_contributions_milestone_id_colab_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."colab_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_contributions" ADD CONSTRAINT "colab_idea_contributions_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_decision_logs" ADD CONSTRAINT "colab_idea_decision_logs_program_id_colab_program_one_big_idea_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."colab_program_one_big_idea"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_decision_logs" ADD CONSTRAINT "colab_idea_decision_logs_focus_idea_id_colab_focus_ideas_id_fk" FOREIGN KEY ("focus_idea_id") REFERENCES "public"."colab_focus_ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_decision_logs" ADD CONSTRAINT "colab_idea_decision_logs_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_reviews" ADD CONSTRAINT "colab_idea_reviews_program_id_colab_program_one_big_idea_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."colab_program_one_big_idea"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_reviews" ADD CONSTRAINT "colab_idea_reviews_focus_idea_id_colab_focus_ideas_id_fk" FOREIGN KEY ("focus_idea_id") REFERENCES "public"."colab_focus_ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_reviews" ADD CONSTRAINT "colab_idea_reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_team_roles" ADD CONSTRAINT "colab_idea_team_roles_program_id_colab_program_one_big_idea_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."colab_program_one_big_idea"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_tracks" ADD CONSTRAINT "colab_idea_tracks_program_id_colab_program_one_big_method_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."colab_program_one_big_method"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_tracks" ADD CONSTRAINT "colab_idea_tracks_cohort_id_colab_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."colab_cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_tracks" ADD CONSTRAINT "colab_idea_tracks_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_tracks" ADD CONSTRAINT "colab_idea_tracks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_idea_tracks" ADD CONSTRAINT "colab_idea_tracks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_method_decision_logs" ADD CONSTRAINT "colab_method_decision_logs_program_id_colab_program_one_big_method_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."colab_program_one_big_method"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_method_decision_logs" ADD CONSTRAINT "colab_method_decision_logs_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_method_frameworks" ADD CONSTRAINT "colab_method_frameworks_program_id_colab_program_one_big_method_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."colab_program_one_big_method"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_method_reviews" ADD CONSTRAINT "colab_method_reviews_program_id_colab_program_one_big_method_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."colab_program_one_big_method"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_method_reviews" ADD CONSTRAINT "colab_method_reviews_cohort_id_colab_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."colab_cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_method_reviews" ADD CONSTRAINT "colab_method_reviews_framework_id_colab_method_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."colab_method_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_method_reviews" ADD CONSTRAINT "colab_method_reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_milestones" ADD CONSTRAINT "colab_milestones_cohort_id_colab_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."colab_cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_milestones" ADD CONSTRAINT "colab_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_program_one_big_idea" ADD CONSTRAINT "colab_program_one_big_idea_cohort_id_colab_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."colab_cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_program_one_big_idea" ADD CONSTRAINT "colab_program_one_big_idea_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_program_one_big_method" ADD CONSTRAINT "colab_program_one_big_method_cohort_id_colab_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."colab_cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_program_one_big_method" ADD CONSTRAINT "colab_program_one_big_method_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_sessions" ADD CONSTRAINT "colab_sessions_cohort_id_colab_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."colab_cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_sessions" ADD CONSTRAINT "colab_sessions_facilitator_user_id_users_id_fk" FOREIGN KEY ("facilitator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colab_track_stage_progress" ADD CONSTRAINT "colab_track_stage_progress_idea_track_id_colab_idea_tracks_id_fk" FOREIGN KEY ("idea_track_id") REFERENCES "public"."colab_idea_tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_evaluations" ADD CONSTRAINT "course_evaluations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_evaluations" ADD CONSTRAINT "course_evaluations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_acceleration_program_id_acceleration_programs_id_fk" FOREIGN KEY ("acceleration_program_id") REFERENCES "public"."acceleration_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_project_id_challenge_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."challenge_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_professional_user_id_users_id_fk" FOREIGN KEY ("professional_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_enrollments" ADD CONSTRAINT "mentorship_enrollments_program_id_mentorship_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."mentorship_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_enrollments" ADD CONSTRAINT "mentorship_enrollments_mentee_user_id_users_id_fk" FOREIGN KEY ("mentee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_enrollments" ADD CONSTRAINT "mentorship_enrollments_mentor_user_id_users_id_fk" FOREIGN KEY ("mentor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_programs" ADD CONSTRAINT "mentorship_programs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_reports" ADD CONSTRAINT "mentorship_reports_session_id_mentorship_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mentorship_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_reports" ADD CONSTRAINT "mentorship_reports_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_sessions" ADD CONSTRAINT "mentorship_sessions_enrollment_id_mentorship_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."mentorship_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_program_id_mentorship_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."mentorship_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_mentee_id_users_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_project_id_challenge_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."challenge_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");
ALTER TABLE "users" ADD COLUMN "username" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");