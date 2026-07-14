import { z } from 'zod';

// Zod schema for character details in the dropdown
export const CharacterDetailsSchema = z.object({
  姓名: z.string().default('未知'),
  性别: z.string().default('未知'),
  容貌: z.string().default('普通'),
  身形: z.string().default('普通'),
  衣着: z.string().default('凡装')
});

// Zod schema for character stats in the progress bars
export const CharacterStatsSchema = z.object({
  生命: z.string().or(z.number()).default(0),
  精血: z.string().or(z.number()).default(0),
  灵力: z.string().or(z.number()).default(0),
  修为: z.string().or(z.number()).default(0),
  神识: z.string().or(z.number()).default(0),
  道心: z.string().or(z.number()).default(0)
});

// Complete MVU Character State Data Schema
export const MvuStateSchema = z.object({
  主角: CharacterDetailsSchema.optional(),
  属性: CharacterStatsSchema.optional(),
  玉简: z.record(
    z.object({
      历史记录: z.record(
        z.object({
          发送者: z.string(),
          内容: z.string(),
          时间: z.string()
        })
      ).default({})
    })
  ).default({})
});

// Simple validation function helper
export function validateState(data) {
  try {
    return { success: true, data: MvuStateSchema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('MVU State Validation failed:', error.errors);
      return { success: false, errors: error.errors };
    }
    return { success: false, error };
  }
}
