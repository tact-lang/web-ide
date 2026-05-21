import { z } from 'zod';

export const TonIdePluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string().optional(),
  skills: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
  tools: z.array(z.string()).optional(),
});

export type TonIdePlugin = z.infer<typeof TonIdePluginSchema>;
