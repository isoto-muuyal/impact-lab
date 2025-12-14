import {
  users,
  userProfiles,
  roles,
  userRoles,
  type User,
  type UpsertUser,
  type UserProfile,
  type InsertUserProfile,
  type Role,
  type UserRole,
  type UserWithProfile,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserWithProfile(id: string): Promise<UserWithProfile | undefined>;
  
  // Profile operations
  getProfile(userId: string): Promise<UserProfile | undefined>;
  upsertProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile>;
  
  // Role operations
  getRoles(): Promise<Role[]>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: { name: 'usuario' | 'mentor' | 'facilitador'; description?: string }): Promise<Role>;
  
  // UserRole operations
  getUserRoles(userId: string): Promise<(UserRole & { role?: Role })[]>;
  assignRole(userId: string, roleId: string): Promise<UserRole>;
  
  // Seed operations
  seedRoles(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
          lastAccessAt: new Date(),
        },
      })
      .returning();
    
    // Assign default role if user is new (no roles assigned)
    const existingRoles = await this.getUserRoles(user.id);
    if (existingRoles.length === 0) {
      const defaultRole = await this.getRoleByName('usuario');
      if (defaultRole) {
        await this.assignRole(user.id, defaultRole.id);
      }
    }
    
    return user;
  }

  async getUserWithProfile(id: string): Promise<UserWithProfile | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const profile = await this.getProfile(id);
    const userRolesWithRole = await this.getUserRoles(id);

    return {
      ...user,
      profile,
      userRoles: userRolesWithRole,
    };
  }

  // Profile operations
  async getProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }

  async upsertProfile(userId: string, profileData: Partial<InsertUserProfile>): Promise<UserProfile> {
    const existing = await this.getProfile(userId);
    
    if (existing) {
      const [updated] = await db
        .update(userProfiles)
        .set({
          ...profileData,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(userProfiles)
      .values({
        userId,
        ...profileData,
      })
      .returning();
    return created;
  }

  // Role operations
  async getRoles(): Promise<Role[]> {
    return db.select().from(roles);
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, name as 'usuario' | 'mentor' | 'facilitador'));
    return role;
  }

  async createRole(roleData: { name: 'usuario' | 'mentor' | 'facilitador'; description?: string }): Promise<Role> {
    const [role] = await db
      .insert(roles)
      .values(roleData)
      .returning();
    return role;
  }

  // UserRole operations
  async getUserRoles(userId: string): Promise<(UserRole & { role?: Role })[]> {
    const result = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    const rolesWithDetails = await Promise.all(
      result.map(async (ur) => {
        const [role] = await db
          .select()
          .from(roles)
          .where(eq(roles.id, ur.roleId));
        return { ...ur, role };
      })
    );

    return rolesWithDetails;
  }

  async assignRole(userId: string, roleId: string): Promise<UserRole> {
    const [userRole] = await db
      .insert(userRoles)
      .values({
        userId,
        roleId,
        isPrimary: 'true',
        status: 'active',
      })
      .returning();
    return userRole;
  }

  // Seed roles
  async seedRoles(): Promise<void> {
    const existingRoles = await this.getRoles();
    
    const rolesToCreate = [
      { name: 'usuario' as const, description: 'Usuario estándar - puede crear proyectos, inscribirse a cursos y solicitar mentoría' },
      { name: 'mentor' as const, description: 'Mentor - guía a emprendedores sociales y revisa proyectos' },
      { name: 'facilitador' as const, description: 'Facilitador - gestiona programas, eventos y supervisa la plataforma' },
    ];

    for (const roleData of rolesToCreate) {
      const exists = existingRoles.find(r => r.name === roleData.name);
      if (!exists) {
        await this.createRole(roleData);
      }
    }
  }
}

export const storage = new DatabaseStorage();
