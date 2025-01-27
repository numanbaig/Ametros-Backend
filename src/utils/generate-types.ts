import * as fs from "fs";
import * as path from "path";

const filePath = path.join(__dirname, "../types/gen.ts");

function replaceNeverWithAny(filePath: string): void {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading file: ${err}`);
      return;
    }

    const updatedData = data.replace(/\bnever\b/g, "any");
    fs.writeFile(filePath, updatedData, "utf8", (err) => {
      if (err) {
        console.error(`Error writing file: ${err}`);
      } else {
        console.log(
          'Replaced all instances of "never" with "any" successfully.'
        );
      }
    });
  });
}

// Call the function to replace 'never' with 'any'
replaceNeverWithAny(filePath);
