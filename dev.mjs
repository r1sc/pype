import esbuild from "esbuild";
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";

const ctx = await esbuild
  .context({
    entryPoints: ["src/main.ts"],
    // mainFields: ["svelte", "browser", "module", "main"],
    bundle: true,
    outdir: "www/dist",
    sourcemap: true,
    loader: {
      '.png': 'dataurl',
      '.woff': 'dataurl',
      '.woff2': 'dataurl',
      '.eot': 'dataurl',
      '.ttf': 'dataurl',
      '.svg': 'dataurl',
    },
    plugins: [sveltePlugin({
      compilerOptions: {
        enableSourcemap: true
      },
      preprocess: sveltePreprocess({
        sourceMap: true
      })
    })],
    logLevel: "info",
  });

await ctx.watch();
const serve = await ctx.serve({ servedir: "www" });
console.log("Serving at", serve.host + ":" + serve.port);