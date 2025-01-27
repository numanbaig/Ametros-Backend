import { readdir, stat, writeFile } from "fs/promises";
import { join, parse } from "path";

const ROUTES_FOLDER = "src/routes";
const camelize = (s: string) => s.replace(/-./g, (x) => x[1].toUpperCase());

const readdirRecursive = async (dir: string): Promise<string[]> => {
  const subdirs = await readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = join(dir, subdir);
      return (await stat(res)).isDirectory() ? readdirRecursive(res) : [res];
    })
  );
  return files.reduce((a, f) => a.concat(f), []);
};
const generateRoutesIndex = async () => {
  const files = await readdirRecursive(ROUTES_FOLDER);
  let indexTs = "//generated file, run 'yarn generate:routes' to update\n\n";

  for (let file of files) {
    const { name, ext } = parse(file);
    if (ext.endsWith("ts") && name !== "index") {
      const routeName = camelize(name);
      const importPath = `import ${routeName} from './${file.slice(
        ROUTES_FOLDER.length + 1,
        -3
      )}';\n`;
      indexTs += importPath;
    }
  }

  const routeExports = files
    .filter((file) => {
      const { name, ext } = parse(file);
      return ext.endsWith("ts") && name !== "index";
    })
    .map((file) => {
      const { name } = parse(file);
      return `\t${camelize(name)},`;
    })
    .join("\n");

  indexTs += `\nexport default {\n${routeExports}\n}`;

  await writeFile(join(ROUTES_FOLDER, "index.ts"), indexTs);
  console.log("Updated routes");
};

generateRoutesIndex();
