import { describe, it, expect } from 'vitest';
import * as schema from '../../server/db/schema';

describe('DB-001: Drizzle Database Schema', () => {
  it('should define all 9 PostgreSQL enums according to Spec 11.1', () => {
    expect(schema.categoryEnum).toBeDefined();
    expect(schema.reportStatusEnum).toBeDefined();
    expect(schema.priorityEnum).toBeDefined();
    expect(schema.taskTypeEnum).toBeDefined();
    expect(schema.taskStatusEnum).toBeDefined();
    expect(schema.staffRoleEnum).toBeDefined();
    expect(schema.followerSourceEnum).toBeDefined();
    expect(schema.photoKindEnum).toBeDefined();
    expect(schema.actorTypeEnum).toBeDefined();

    expect(schema.categoryEnum.enumValues).toEqual([
      'den_duong',
      'ngap_nuoc',
      'rac_thai',
      'mat_duong',
    ]);

    expect(schema.reportStatusEnum.enumValues).toEqual([
      'moi',
      'da_tiep_nhan',
      'cho_xac_minh',
      'da_giao',
      'hoan_thanh',
      'dong',
      'mo_lai',
      'can_bo_sung',
      'da_gop',
      'chuyen_co_quan_khac',
      'khong_xac_nhan',
    ]);

    expect(schema.priorityEnum.enumValues).toEqual(['cao', 'binh_thuong']);
    expect(schema.taskTypeEnum.enumValues).toEqual(['xac_minh', 'nghiem_thu']);
    expect(schema.taskStatusEnum.enumValues).toEqual(['cho_nhan', 'dang_lam', 'xong']);
    expect(schema.staffRoleEnum.enumValues).toEqual(['can_bo', 'tnv']);
    expect(schema.followerSourceEnum.enumValues).toEqual(['reporter', 'also_me', 'subscribe_later']);
    expect(schema.photoKindEnum.enumValues).toEqual(['before', 'after', 'verify', 'feedback']);
    expect(schema.actorTypeEnum.enumValues).toEqual(['citizen', 'staff', 'system']);
  });

  it('should define all 16 tables according to Spec 11.2', () => {
    expect(schema.departments).toBeDefined();
    expect(schema.categorySettings).toBeDefined();
    expect(schema.staffProfiles).toBeDefined();
    expect(schema.reports).toBeDefined();
    expect(schema.reportPhotos).toBeDefined();
    expect(schema.reportFollowers).toBeDefined();
    expect(schema.reportTimeline).toBeDefined();
    expect(schema.reportDuplicateFlags).toBeDefined();
    expect(schema.feedback).toBeDefined();
    expect(schema.volunteerTasks).toBeDefined();
    expect(schema.notifications).toBeDefined();
    expect(schema.phoneOtps).toBeDefined();
    expect(schema.anonymousSubmissions).toBeDefined();
    expect(schema.accessAttempts).toBeDefined();
    expect(schema.pendingUploads).toBeDefined();
    expect(schema.appSettings).toBeDefined();
  });

  it('reports table should have is_seed column and all required fields', () => {
    const cols = schema.reports;
    expect(cols.id).toBeDefined();
    expect(cols.code).toBeDefined();
    expect(cols.category).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.priority).toBeDefined();
    expect(cols.location).toBeDefined();
    expect(cols.address).toBeDefined();
    expect(cols.anonymous).toBeDefined();
    expect(cols.secretCodeHash).toBeDefined();
    expect(cols.ownerTokenHash).toBeDefined();
    expect(cols.version).toBeDefined();
    expect(cols.isSeed).toBeDefined();
  });
});
