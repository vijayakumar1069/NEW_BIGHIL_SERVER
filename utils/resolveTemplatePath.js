import path from "path";
import { fileURLToPath } from "url";

export function resolveTemplatePath(relativePathFromTemplatesDir) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  return path.join(
    __dirname,
    "../email templates",
    relativePathFromTemplatesDir
  );
}
