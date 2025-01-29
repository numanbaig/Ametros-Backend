import fs from "fs";
import path from "path";

// Define paths
const schemaPath = path.join(__dirname, "../prisma/schema.prisma");
const modelsPath = path.join(__dirname, "../prisma/models");

console.log("schemaPath", schemaPath);

// Read generator and datasource from schema.prisma
let baseSchema = fs.readFileSync(schemaPath, "utf8");

// Keep track of added models to avoid duplicates
const addedModels = new Set<string>();

// Function to extract model names from schema content
const extractModelNames = (schema: string) => {
  const modelRegex = /model\s+(\w+)\s+\{/g;
  const modelNames: string[] = [];
  let match;
  while ((match = modelRegex.exec(schema)) !== null) {
    modelNames.push(match[1]);
  }
  return modelNames;
};

// Extract model names from the existing base schema
const existingModels = extractModelNames(baseSchema);

// Add existing models to the set so we don't append duplicates
existingModels.forEach((model) => addedModels.add(model));

// Get all model files from the models folder
const modelFiles = fs
  .readdirSync(modelsPath)
  .filter((file) => file.endsWith(".prisma"));

// Read and concatenate all model files, skipping duplicates
const models = modelFiles
  .map((file) => {
    const modelContent = fs.readFileSync(path.join(modelsPath, file), "utf8");
    const modelNames = extractModelNames(modelContent);

    // Check if any model from this file has already been added
    const shouldSkip = modelNames.some((modelName) =>
      addedModels.has(modelName)
    );
    if (shouldSkip) {
      console.log(`Skipping duplicate model(s) from file: ${file}`);
      return "";
    }

    // Add model names to the set to track them
    modelNames.forEach((modelName) => addedModels.add(modelName));

    return modelContent;
  })
  .filter(Boolean) // Remove empty strings (skipped files)
  .join("\n\n");

// Combine base schema with models, if any new models are found
if (models.length > 0) {
  baseSchema += `\n\n${models}`;
}

// Write the merged schema back to schema.prisma
fs.writeFileSync(schemaPath, baseSchema, "utf8");

console.log("Schema merged successfully!");
