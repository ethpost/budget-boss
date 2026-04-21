const path = require("node:path");
const { register } = require("tsx/cjs/api");

const scriptPath = process.argv[2];

if (!scriptPath) {
  throw new Error("Missing script path argument");
}

register();
require(path.resolve(__dirname, scriptPath));
