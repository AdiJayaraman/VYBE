import { cloneTemplateScene } from '@vybe/3d-core';
import { SceneGraphSchema, type SceneProp } from '@vybe/shared-types';

/** Never let a malformed `Room.sceneGraph` break a render or a gateway join. */
export function parseSceneGraph(value: unknown, templateId: string): SceneProp[] {
  const parsed = SceneGraphSchema.safeParse(value);
  return parsed.success ? parsed.data : cloneTemplateScene(templateId);
}
