const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Compile the real client and its relative TypeScript dependencies for HTTP tests.
// Each call has its own module cache, like an independent browser bundle.
module.exports = function loadWebClient() {
  const root = path.resolve(__dirname, '../apps/web/src/lib');
  const cache = new Map();
  function load(file) {
    if (!file.startsWith(root + path.sep))
      throw new Error('Outside client source');
    if (cache.has(file)) return cache.get(file).exports;
    const compiled = new Module(file, module);
    compiled.paths = Module._nodeModulePaths(path.dirname(file));
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      const candidate = path.resolve(path.dirname(file), specifier + '.ts');
      return specifier.startsWith('.') && fs.existsSync(candidate)
        ? load(candidate)
        : nativeRequire(specifier);
    };
    cache.set(file, compiled);
    compiled._compile(
      ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      file,
    );
    return compiled.exports;
  }
  return load(path.join(root, 'api.ts'));
};
