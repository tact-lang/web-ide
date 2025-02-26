import { z } from 'zod';

const iTabItemsSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.union([z.literal('default'), z.literal('git')]).default('default'),
  isDirty: z.boolean().optional(),
});

const activeTabSchema = z.preprocess(
  (val) => {
    // If val was a string in the old data, transform it
    if (typeof val === 'string') {
      return { path: val, type: 'default' };
    }
    // Otherwise, assume it's already an object in the new format
    return val;
  },
  // Now validate the object structure
  z.object({
    path: z.string(),
    type: z.union([z.literal('default'), z.literal('git')]),
  }),
);

export const iFileTabSchema = z.object({
  items: z.array(iTabItemsSchema),
  active: activeTabSchema,
});
