import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "public/sw.js",
    "public/sw.js.map",
    "tests/*.js",
  ]),
  {
    rules: {
      // setState in useEffect is a valid pattern for SSR hydration and state machines
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
